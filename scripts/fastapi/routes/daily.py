"""
Daily problem routes
"""

from fastapi import APIRouter, Depends

from models import DailyProblemRequest
from auth import verify_api_key
from aws import DailyProblemOperations
from cache_manager import cache_manager, CacheType

router = APIRouter(tags=["Daily Problems"])

DEBUG_MODE = False


@router.get("/daily-problem/{username}")
async def get_daily_problem_endpoint(
    username: str,
    api_key: str = Depends(verify_api_key)
):
    """Get daily problem data for a user"""
    try:
        # Check cache first for daily problem
        cached_problem = cache_manager.get(CacheType.DAILY_PROBLEM)
        cached_completions = cache_manager.get(CacheType.DAILY_COMPLETIONS)
        
        if cached_problem and cached_completions:
            # Use cached data
            problem_data = cached_problem
            completions_data = cached_completions
            
            # Check if user completed today's problem
            user_completed = username in completions_data.get('users', [])
            
            # Get user's streak from database (this changes frequently)
            user_data = DailyProblemOperations.get_user_daily_data(username)
            
            return {
                "success": True,
                "data": {
                    "dailyComplete": user_completed,
                    "streak": user_data.get('streak', 0),
                    "todaysProblem": problem_data,
                    "error": None,
                }
            }
        
        # Fallback to database if cache miss
        result = DailyProblemOperations.get_daily_problem_data(username)
        return result
        
    except Exception as error:
        return {"success": False, "error": str(error)}


@router.post("/complete-daily-problem")
async def complete_daily_problem_endpoint(
    request: DailyProblemRequest,
    api_key: str = Depends(verify_api_key)
):
    """Mark daily problem as completed for a user"""
    try:
        # Complete the problem in database
        result = DailyProblemOperations.complete_daily_problem(request.username)
        
        # Invalidate cache to force refresh
        cache_manager.invalidate_all(CacheType.DAILY_COMPLETIONS)
        
        return result
    except Exception as error:
        return {"success": False, "error": str(error)}


@router.get("/top-daily-problems")
async def get_top_daily_problems_endpoint(
    api_key: str = Depends(verify_api_key)
):
    """Get top 2 daily problems for caching"""
    try:
        # Check cache first
        cached_problems = cache_manager.get(CacheType.DAILY_PROBLEM)
        if cached_problems:
            return {"success": True, "data": [cached_problems]}
        
        # Fallback to database
        result = DailyProblemOperations.get_top_daily_problems()
        return result
    except Exception as error:
        return {"success": False, "error": str(error)}


@router.get("/daily-completions")
async def get_daily_completions_endpoint(
    api_key: str = Depends(verify_api_key)
):
    """Get today's daily problem completions"""
    try:
        # Check cache first
        cached_completions = cache_manager.get(CacheType.DAILY_COMPLETIONS)
        if cached_completions:
            return cached_completions
        
        # Fallback to database
        result = DailyProblemOperations.get_todays_completions()
        return result
    except Exception as error:
        return {"success": False, "error": str(error)}