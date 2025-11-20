"""
Duel routes
"""

from fastapi import APIRouter, Depends

from models import DuelRequest
from auth import verify_api_key
from aws import DuelOperations
from cache_manager import cache_manager, CacheType

router = APIRouter(tags=["Duels"])

DEBUG_MODE = True


@router.get("/duels/{username}")
async def get_user_duels_endpoint(
    username: str,
    api_key: str = Depends(verify_api_key)
):
    """Get duels for a user and automatically clean up expired duels"""
    try:
        # First, clean up any expired duels automatically
        cleanup_result = DuelOperations.cleanup_expired_duels()
        if cleanup_result.get('count', 0) > 0:
            print(f"[DEBUG] Cleaned up {cleanup_result.get('count', 0)} expired duels during get_user_duels")
        
        # Check cache first for duels
        cached_duels = cache_manager.get(CacheType.DUELS)
        if cached_duels:
            # Filter duels for this user
            user_duels = []
            for duel in cached_duels.get('data', []):
                if (duel.get('username') == username or 
                    duel.get('opponent') == username):
                    user_duels.append(duel)
            
            return {
                "success": True,
                "data": user_duels
            }
        
        # Fallback to database
        result = DuelOperations.get_user_duels(username)
        return result
    except Exception as error:
        return {"success": False, "error": str(error)}


@router.post("/create-duel")
async def create_duel_endpoint(
    request: DuelRequest,
    api_key: str = Depends(verify_api_key)
):
    """Create a new duel"""
    try:
        if DEBUG_MODE:
            wager_info = f", is_wager: {request.is_wager}, wager_amount: {request.wager_amount}" if request.is_wager else ""
            print(f"[DEBUG] Creating duel - username: {request.username}, opponent: {request.opponent}, problem_slug: {request.problem_slug}, problem_title: {request.problem_title}, problem_number: {request.problem_number}, difficulty: {request.difficulty}{wager_info}")

        result = DuelOperations.create_duel(
            request.username,
            request.opponent,
            request.problem_slug,
            request.problem_title,
            request.problem_number,
            request.difficulty,
            request.is_wager or False,
            request.wager_amount
        )

        # NOTE: No cache invalidation - create_duel uses cache-first writes
        # Cache is updated in-place, invalidation would destroy uncommitted data

        return result
    except Exception as error:
        return {"success": False, "error": str(error)}


@router.post("/accept-duel")
async def accept_duel_endpoint(
    request: DuelRequest,
    api_key: str = Depends(verify_api_key)
):
    """Accept a duel. For wager duels, opponent must specify their wager amount."""
    try:
        result = DuelOperations.accept_duel(
            request.username,
            request.duel_id,
            request.wager_amount  # Opponent's wager for wager duels
        )

        # NOTE: No need to invalidate cache - cache-first writes handle this automatically
        # Invalidating causes cache misses for subsequent requests

        return result
    except Exception as error:
        return {"success": False, "error": str(error)}


@router.post("/start-duel")
async def start_duel_endpoint(
    request: DuelRequest,
    api_key: str = Depends(verify_api_key)
):
    """Mark that a user has started working on a duel"""
    try:
        result = DuelOperations.start_duel(request.username, request.duel_id)

        # NOTE: No cache invalidation - start_duel uses cache-first writes
        # Cache is updated in-place via update_duel_in_cache()

        return result
    except Exception as error:
        return {"success": False, "error": str(error)}


@router.post("/complete-duel")
async def complete_duel_endpoint(
    request: DuelRequest,
    api_key: str = Depends(verify_api_key)
):
    """Complete a duel submission"""
    try:
        # Legacy endpoint - redirects to record submission
        result = DuelOperations.record_duel_submission(request.username, request.duel_id, 0)

        # NOTE: No cache invalidation - record_duel_submission uses cache-first writes
        # Cache is updated in-place via update_duel_in_cache()

        return result
    except Exception as error:
        return {"success": False, "error": str(error)}


@router.post("/reject-duel")
async def reject_duel_endpoint(
    request: dict,
    api_key: str = Depends(verify_api_key)
):
    """Reject a duel"""
    try:
        duel_id = request.get('duel_id')
        if not duel_id:
            return {"success": False, "error": "Duel ID required"}
        
        result = DuelOperations.reject_duel(duel_id)

        # NOTE: No cache invalidation - reject_duel uses cache-first writes
        # Cache is updated in-place via delete_duel_from_cache()

        return result
    except Exception as error:
        return {"success": False, "error": str(error)}


@router.post("/record-duel-submission")
async def record_duel_submission_endpoint(
    request: dict,
    api_key: str = Depends(verify_api_key)
):
    """Record a duel submission with elapsed time"""
    try:
        username = request.get('username')
        duel_id = request.get('duel_id')
        elapsed_ms = request.get('elapsed_ms', 0)
        
        if not duel_id or not username:
            return {"success": False, "error": "Duel ID and username required"}
        
        result = DuelOperations.record_duel_submission(username, duel_id, elapsed_ms)

        # NOTE: No cache invalidation - record_duel_submission uses cache-first writes
        # Cache is updated in-place via update_duel_in_cache()

        return result
    except Exception as error:
        return {"success": False, "error": str(error)}


@router.get("/duel/{duel_id}")
async def get_duel_endpoint(
    duel_id: str,
    api_key: str = Depends(verify_api_key)
):
    """Get a specific duel by ID"""
    try:
        # Check cache first for duels
        cached_duels = cache_manager.get(CacheType.DUELS)
        if cached_duels:
            for duel in cached_duels.get('data', []):
                # FIXED: Use 'duelId' not 'id' to match DynamoDB schema
                if duel.get('duelId') == duel_id:
                    return {"success": True, "data": duel}
        
        # Fallback to database
        result = DuelOperations.get_duel_by_id(duel_id)
        return result
    except Exception as error:
        return {"success": False, "error": str(error)}