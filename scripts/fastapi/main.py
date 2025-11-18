#!/usr/bin/env python3
"""
FastAPI server for YeetCode email OTP functionality
"""

import os
import sys
import argparse
import asyncio
from contextlib import asynccontextmanager
from datetime import datetime
from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Parse command line arguments for environment selection
parser = argparse.ArgumentParser(description='YeetCode FastAPI Server')
parser.add_argument('--env', type=str, default='prod', choices=['prod', 'dev'],
                    help='Environment to run (prod or dev)')
args, unknown = parser.parse_known_args()

# Load environment-specific .env file
env_file = f'.env.{args.env}'
if os.path.exists(env_file):
    load_dotenv(env_file)
    print(f"✅ Loaded environment from {env_file}")
else:
    # Fallback to default .env
    load_dotenv()
    print(f"⚠️ {env_file} not found, using default .env")

# Import routers
from routes.auth import router as auth_router
from routes.users import router as users_router
from routes.groups import router as groups_router
from routes.daily import router as daily_router
from aws import VerificationOperations
from routes.bounties import router as bounties_router
from routes.duels import router as duels_router
from routes.admin import router as admin_router

# Import cache manager and AWS operations
from cache_manager import cache_manager
from aws import DuelOperations
from logger import debug, info, warning, error
from scheduler import start_scheduler, stop_scheduler, get_scheduler_status, trigger_job_manually
from wal_manager import wal_manager
from cache_loader import load_all_data_into_cache
from cache_dumper import dump_cache_to_db

# Lifespan event handler
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle startup and shutdown events"""
    # Startup
    info("🚀 Starting FastAPI server with cache-first architecture")

    # 1. Initialize WAL manager and attach to cache
    info("📝 Initializing WAL manager...")
    cache_manager.set_wal_manager(wal_manager)

    # 2. Replay WAL file if it exists (crash recovery)
    info("🔄 Replaying WAL for crash recovery...")
    wal_replayed = wal_manager.replay(cache_manager)
    if wal_replayed > 0:
        info(f"✅ Replayed {wal_replayed} WAL entries from previous session")

    # 3. Load all data from DynamoDB into cache
    info("📦 Loading data from DynamoDB into cache...")
    load_result = await load_all_data_into_cache()
    if load_result.get('success'):
        info(f"✅ Loaded {load_result.get('total', 0)} items into cache")
    else:
        error(f"❌ Failed to load cache: {load_result.get('error')}")

    # 4. Start the APScheduler for background jobs
    start_scheduler()

    # 5. Start existing background tasks
    duel_task = asyncio.create_task(monitor_active_duels())
    cleanup_task = asyncio.create_task(cleanup_expired_codes_task())

    info("✅ FastAPI server started successfully")

    yield

    # Shutdown
    info("🛑 Shutting down FastAPI server...")

    # 1. Perform final cache dump to DynamoDB
    info("💾 Performing final cache dump before shutdown...")
    dump_result = await dump_cache_to_db()
    if dump_result.get('success'):
        info(f"✅ Final dump complete: {dump_result.get('entries', 0)} entries saved")
    else:
        error(f"⚠️ Final dump failed: {dump_result.get('error')}")

    # 2. Stop the scheduler
    stop_scheduler()

    # 3. Cancel background tasks
    duel_task.cancel()
    cleanup_task.cancel()

    info("✅ FastAPI server shutdown complete")

app = FastAPI(
    title="YeetCode Email API",
    description="FastAPI server for handling email OTP functionality",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware if needed
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this based on your needs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration with error handling
DEBUG_MODE = os.getenv("DEBUG_MODE", "false").lower() == "true"

PORT_STR = os.getenv("PORT")
if not PORT_STR:
    raise ValueError("PORT environment variable is required")
PORT = int(PORT_STR)

HOST = os.getenv("HOST")
if not HOST:
    raise ValueError("HOST environment variable is required")

# Include routers
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(groups_router)
app.include_router(daily_router)
app.include_router(bounties_router)
app.include_router(duels_router)
app.include_router(admin_router)

if DEBUG_MODE:
    print("[DEBUG] Registered routes:")
    print("Akeen chomu but bleh!")
    for route in app.routes:
        if hasattr(route, 'path'):
            print(f"  {route.methods} {route.path}")


@app.get("/")
async def root():
    """Health check endpoint"""
    return {"message": "YeetCode Email API is running", "timestamp": datetime.now().isoformat()}


@app.get("/health")
async def health_check():
    """Health check endpoint for deployment verification"""
    return {
        "status": "healthy",
        "environment": args.env,
        "port": PORT,
        "timestamp": datetime.now().isoformat()
    }


@app.get("/cache/stats")
async def get_cache_stats():
    """Get cache statistics"""
    return cache_manager.get_cache_stats()


@app.post("/cache/clear")
async def clear_cache():
    """Clear all cache (admin only) - dumps dirty data to DB first to prevent data loss"""
    # CRITICAL: Dump dirty entries to DB BEFORE clearing cache
    # This prevents data loss from uncommitted changes
    dump_result = await dump_cache_to_db()
    dumped_entries = dump_result.get('entries', 0)

    if not dump_result.get('success'):
        error(f"Failed to dump cache before clearing: {dump_result.get('error')}")
        return {
            "success": False,
            "error": f"Failed to dump dirty data before clearing: {dump_result.get('error')}"
        }

    # Now safe to clear cache after dirty data is saved
    # Use thread-safe clear_all() method instead of direct _cache access
    cache_manager.clear_all()
    info(f"✅ Cache cleared after dumping {dumped_entries} entries")

    return {
        "success": True,
        "message": "Cache cleared",
        "dirty_entries_dumped": dumped_entries
    }


# Background task for monitoring active duels
async def monitor_active_duels():
    """Background task to monitor active duels for timeouts and completion"""
    info("Starting duel monitoring background task")
    
    while True:
        try:
            # First check if there are any active duels before processing
            scan_params = {
                'TableName': os.getenv('DUELS_TABLE'),
                'FilterExpression': '#status = :active',
                'ExpressionAttributeNames': {'#status': 'status'},
                'ExpressionAttributeValues': {':active': {'S': 'ACTIVE'}},
                'Select': 'COUNT'  # Only count, don't return data
            }
            
            from aws import ddb
            scan_result = ddb.scan(**scan_params)
            active_duels_count = scan_result.get('Count', 0)
            
            if active_duels_count > 0:
                from logger import duel_check, duel_action
                duel_check(f"Checking {active_duels_count} active duels for timeouts")
                # Only process timeouts if there are active duels
                result = await DuelOperations.handle_duel_timeouts()
                if result.get('completed_duels', 0) > 0:
                    duel_action(f"Processed {result['completed_duels']} duel timeouts ({active_duels_count} active duels)")
            
        except Exception as error:
            error(f"Duel monitoring error: {error}")
        
        # Check every 30 seconds
        await asyncio.sleep(30)

# Background task for cleaning up expired verification codes
async def cleanup_expired_codes_task():
    """Background task to clean up expired verification codes every 5 minutes"""
    debug("Starting cleanup expired codes background task")
    
    while True:
        try:
            result = VerificationOperations.cleanup_expired_codes()
            if result.get('count', 0) > 0:
                info(f"Cleaned up {result.get('count', 0)} expired verification codes")
        except Exception as error:
            error(f"Cleanup expired codes error: {error}")
        
        # Check every 5 minutes
        await asyncio.sleep(5 * 60)




if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=HOST, port=PORT)
