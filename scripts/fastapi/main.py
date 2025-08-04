#!/usr/bin/env python3
"""
FastAPI server for YeetCode email OTP functionality
"""

import os
from datetime import datetime
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import routers
from routes.auth import router as auth_router
from routes.users import router as users_router
from routes.groups import router as groups_router
from routes.daily import router as daily_router
from routes.bounties import router as bounties_router
from routes.duels import router as duels_router

# Import cache manager
from cache_manager import cache_manager

app = FastAPI(
    title="YeetCode Email API",
    description="FastAPI server for handling email OTP functionality",
    version="1.0.0"
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

if DEBUG_MODE:
    print("[DEBUG] Registered routes:")
    for route in app.routes:
        if hasattr(route, 'path'):
            print(f"  {route.methods} {route.path}")


@app.get("/")
async def root():
    """Health check endpoint"""
    return {"message": "YeetCode Email API is running", "timestamp": datetime.now().isoformat()}


@app.get("/health")
async def health_check():
    """Health check endpoint with API status"""
    import resend
    from aws import USERS_TABLE
    
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "resend_configured": bool(resend.api_key),
        "dynamodb_configured": bool(USERS_TABLE),
        "debug_mode": DEBUG_MODE,
        "cache_stats": cache_manager.get_cache_stats()
    }


@app.get("/cache/stats")
async def get_cache_stats():
    """Get cache statistics"""
    return cache_manager.get_cache_stats()


@app.post("/cache/clear")
async def clear_cache():
    """Clear all cache (admin only)"""
    # In a real app, you'd add authentication here
    cache_manager._cache.clear()
    return {"success": True, "message": "Cache cleared"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=HOST, port=PORT)