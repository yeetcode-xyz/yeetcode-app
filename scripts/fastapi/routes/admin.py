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
