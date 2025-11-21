"""
Admin routes for YeetCode FastAPI server
Provides endpoints for managing background tasks and system operations
"""

from fastapi import APIRouter, Depends, Request, HTTPException, Query
from fastapi.responses import HTMLResponse
from auth import verify_api_key
from scheduler import get_scheduler_status, trigger_job_manually
import logging
import os
from datetime import datetime

router = APIRouter(tags=["Admin"], prefix="/admin")

# Simple query parameter authentication for browser access
def verify_api_key_query(api_key: str = Query(...)):
    """Verify API key from query parameter for browser-friendly endpoints"""
    expected_key = os.getenv("YETCODE_API_KEY")
    if not expected_key:
        raise HTTPException(status_code=500, detail="Server configuration error")
    if api_key != expected_key:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return api_key

# In-memory log storage (limited to last 500 entries)
log_buffer = []
MAX_LOGS = 500


class AdminLogHandler(logging.Handler):
    """Custom log handler that stores logs in memory for the admin dashboard"""

    def emit(self, record):
        try:
            log_entry = {
                "timestamp": datetime.fromtimestamp(record.created).strftime("%Y-%m-%d %H:%M:%S"),
                "level": record.levelname,
                "message": self.format(record),
                "logger": record.name
            }
            log_buffer.append(log_entry)
            # Keep only the last MAX_LOGS entries
            if len(log_buffer) > MAX_LOGS:
                log_buffer.pop(0)
        except Exception:
            self.handleError(record)


# Add the handler to the background_tasks logger
background_logger = logging.getLogger("background_tasks")
admin_handler = AdminLogHandler()
admin_handler.setFormatter(logging.Formatter('%(levelname)s - %(message)s'))
background_logger.addHandler(admin_handler)


@router.get("/scheduler/status")
async def get_scheduler_status_endpoint(
    api_key: str = Depends(verify_api_key)
):
    """Get the status of the background task scheduler"""
    try:
        status = get_scheduler_status()
        return {"success": True, "data": status}
    except Exception as error:
        return {"success": False, "error": str(error)}


@router.post("/trigger/stats-update")
async def trigger_stats_update(
    api_key: str = Depends(verify_api_key)
):
    """Manually trigger the user stats update task"""
    try:
        result = await trigger_job_manually('update_user_stats')
        return result
    except Exception as error:
        return {"success": False, "error": str(error)}


@router.post("/trigger/bounty-update")
async def trigger_bounty_update(
    api_key: str = Depends(verify_api_key)
):
    """Manually trigger the bounty progress update task"""
    try:
        result = await trigger_job_manually('update_bounty_progress')
        return result
    except Exception as error:
        return {"success": False, "error": str(error)}


@router.post("/trigger/daily-problem")
async def trigger_daily_problem(
    api_key: str = Depends(verify_api_key)
):
    """Manually trigger the daily problem generation task"""
    try:
        result = await trigger_job_manually('generate_daily_problem')
        return result
    except Exception as error:
        return {"success": False, "error": str(error)}


@router.get("/logs", response_class=HTMLResponse)
async def serve_log_viewer(
    api_key: str = Depends(verify_api_key_query)
):
    """Serve the interactive log viewer for fastapi.log

    Access via: /admin/logs?api_key=YOUR_API_KEY
    """
    try:
        html_path = os.path.join(os.path.dirname(__file__), "../static/log_viewer.html")

        if not os.path.exists(html_path):
            return HTMLResponse(
                content="<h1>Log viewer not found</h1><p>File: {}</p>".format(html_path),
                status_code=404
            )

        with open(html_path, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    except Exception as error:
        return HTMLResponse(
            content=f"<h1>Error loading log viewer</h1><p>{str(error)}</p>",
            status_code=500
        )


@router.get("/logs/content")
async def get_log_content(
    api_key: str = Depends(verify_api_key_query)
):
    """Get the raw log file content (fastapi.log for prod, fastapi-dev.log for dev)

    Access via: /admin/logs/content?api_key=YOUR_API_KEY
    """
    try:
        # Determine which log file to use based on environment
        port = os.getenv("PORT", "6969")
        log_filename = "fastapi-dev.log" if port == "42069" else "fastapi.log"

        # Log file is in the parent directory (scripts/fastapi/../)
        log_path = os.path.join(os.path.dirname(__file__), f"../{log_filename}")

        if not os.path.exists(log_path):
            raise HTTPException(status_code=404, detail=f"Log file not found at {log_path}")

        with open(log_path, "r", encoding="utf-8") as f:
            content = f.read()

        return {"success": True, "content": content, "path": log_path}
    except Exception as error:
        return {"success": False, "error": str(error)}


@router.get("/cache/status")
async def get_cache_status(
    api_key: str = Depends(verify_api_key_query)
):
    """Get comprehensive cache status including all entries and WAL stats

    Access via: /admin/cache/status?api_key=YOUR_API_KEY

    Returns:
        - Cache stats (size, hit rate, entries per type)
        - WAL stats (entries, checkpoint, file size)
        - Sample of cache entries (keys only, for privacy)
        - Dirty entries count
    """
    try:
        from cache_manager import cache_manager
        from wal_manager import wal_manager

        # Get cache stats
        cache_stats = cache_manager.get_cache_stats()

        # Get WAL stats
        wal_stats = wal_manager.get_stats()

        # Get dirty entries info (without exposing data)
        dirty_entries = cache_manager.get_dirty_entries()
        dirty_summary = []
        for entry in dirty_entries:
            dirty_summary.append({
                "cache_type": entry.get('cache_type'),
                "identifier": entry.get('identifier', '(no identifier)'),
                "timestamp": entry.get('timestamp'),
                "last_synced": entry.get('last_synced')
            })

        # Get cache keys by type (for debugging)
        # Note: Accessing _cache directly for admin debugging only
        # TODO: Add public method to CacheManager for proper encapsulation
        cache_keys_by_type = {}
        for cache_type in ["users", "duels", "bounties", "daily_problem", "daily_completions", "user_daily_data"]:
            keys = [k for k in cache_manager._cache.keys() if k.startswith(f"{cache_type}:")]
            cache_keys_by_type[cache_type] = {
                "count": len(keys),
                "sample_keys": keys[:5]  # Only show first 5 for privacy
            }

        return {
            "success": True,
            "data": {
                "cache": cache_stats,
                "wal": wal_stats,
                "dirty_entries": {
                    "count": len(dirty_entries),
                    "entries": dirty_summary[:10]  # Only show first 10
                },
                "cache_keys_by_type": cache_keys_by_type,
                "timestamp": datetime.utcnow().isoformat()
            }
        }
    except Exception as error:
        return {"success": False, "error": str(error)}


@router.post("/cache/dump")
async def trigger_cache_dump(
    api_key: str = Depends(verify_api_key_query)
):
    """Manually trigger cache dump to DynamoDB

    Access via: POST /admin/cache/dump?api_key=YOUR_API_KEY
    """
    try:
        from cache_dumper import dump_cache_to_db
        result = await dump_cache_to_db()
        # dump_cache_to_db already returns {"success": ..., ...}, don't double-wrap
        return result
    except Exception as error:
        return {"success": False, "error": str(error)}
