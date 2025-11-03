"""
Admin routes for YeetCode FastAPI server
Provides endpoints for managing background tasks and system operations
"""

from fastapi import APIRouter, Depends
from auth import verify_api_key
from scheduler import get_scheduler_status, trigger_job_manually

router = APIRouter(tags=["Admin"], prefix="/admin")


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
