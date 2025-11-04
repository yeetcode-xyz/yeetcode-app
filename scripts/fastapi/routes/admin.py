"""
Admin routes for YeetCode FastAPI server
Provides endpoints for managing background tasks and system operations
"""

from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse
from auth import verify_api_key
from scheduler import get_scheduler_status, trigger_job_manually
import logging
from datetime import datetime

router = APIRouter(tags=["Admin"], prefix="/admin")

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
