"""
Daily problem routes
"""

from fastapi import APIRouter, Depends

from models import DailyProblemRequest
from auth import verify_api_key
from aws import DailyProblemOperations
from cache_manager import cache_manager, CacheType

router = APIRouter(tags=["Daily Problems"])

DEBUG_MODE = True


@router.get("/daily-problem/{username}")
async def get_daily_problem_endpoint(
    username: str,
    api_key: str = Depends(verify_api_key)
):
    """Get daily problem data for a user"""
    try:
        print(f"[DEBUG] Getting daily problem for user: {username}")
        
        # Check cache first for daily problem
        cached_problem = cache_manager.get(CacheType.DAILY_PROBLEM)
        cached_completions = cache_manager.get(CacheType.DAILY_COMPLETIONS)
        
        print(f"[DEBUG] Cached problem: {'Found' if cached_problem else 'Not found'}")
        print(f"[DEBUG] Cached completions: {'Found' if cached_completions else 'Not found'}")
        
        if cached_problem:
            # Have cached problem
            problem_data = cached_problem
            
            # Check or create completions cache
            if cached_completions:
                completions_data = cached_completions
            else:
                # Create completions data from the cached problem
                print("[DEBUG] Populating missing completions cache")
                completions_data = {
                    "success": True,
                    "data": {
                        "users": problem_data.get('users', {}),
                        "problem_date": problem_data.get('date')
                    }
                }
                # Cache the completions
                cache_manager.set(CacheType.DAILY_COMPLETIONS, completions_data)
            
            # Check if user completed today's problem
            user_completed = username in completions_data.get('data', {}).get('users', {})
            
            # Check cache for user's streak data
            cached_user_data = cache_manager.get(CacheType.USER_DAILY_DATA, username)
            if cached_user_data:
                # Use cached user data
                user_data = cached_user_data
                print(f"[CACHE] Using cached user daily data for {username}")
            else:
                # Get user's streak from database and cache it
                user_data = DailyProblemOperations.get_user_daily_data(username)
                cache_manager.set(CacheType.USER_DAILY_DATA, user_data, username)
                print(f"[CACHE] Cached user daily data for {username}")
            
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
        # Also invalidate the user's daily data cache
        cache_manager.invalidate(CacheType.USER_DAILY_DATA, request.username)
        
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