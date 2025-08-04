"""
Duel routes
"""

from fastapi import APIRouter, Depends

from models import DuelRequest
from auth import verify_api_key
from aws import DuelOperations
from cache_manager import cache_manager, CacheType

router = APIRouter(tags=["Duels"])

DEBUG_MODE = False


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
        result = DuelOperations.create_duel(
            request.username, 
            request.opponent, 
            request.problem_slug
        )
        
        # Invalidate cache to force refresh
        cache_manager.invalidate_all(CacheType.DUELS)
        
        return result
    except Exception as error:
        return {"success": False, "error": str(error)}


@router.post("/accept-duel")
async def accept_duel_endpoint(
    request: DuelRequest,
    api_key: str = Depends(verify_api_key)
):
    """Accept a duel"""
    try:
        result = DuelOperations.accept_duel(request.username, request.duel_id)
        
        # Invalidate cache to force refresh
        cache_manager.invalidate_all(CacheType.DUELS)
        
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
        
        # Invalidate cache to force refresh
        cache_manager.invalidate_all(CacheType.DUELS)
        
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
        
        # Invalidate cache to force refresh
        cache_manager.invalidate_all(CacheType.DUELS)
        
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
        
        # Invalidate cache to force refresh
        cache_manager.invalidate_all(CacheType.DUELS)
        
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
                if duel.get('id') == duel_id:
                    return {"success": True, "data": duel}
        
        # Fallback to database
        result = DuelOperations.get_duel_by_id(duel_id)
        return result
    except Exception as error:
        return {"success": False, "error": str(error)}