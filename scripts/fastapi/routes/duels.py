"""
Duel routes
"""

from fastapi import APIRouter, Depends

from ..models import DuelRequest
from ..auth import verify_api_key
from ..aws import DuelOperations

router = APIRouter(prefix="/api/v1", tags=["Duels"])

DEBUG_MODE = False


@router.get("/duels/{username}")
async def get_user_duels_endpoint(
    username: str,
    api_key: str = Depends(verify_api_key)
):
    """Get duels for a user"""
    try:
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
        result = DuelOperations.get_duel_by_id(duel_id)
        return result
    except Exception as error:
        return {"success": False, "error": str(error)}


@router.post("/cleanup-expired-duels")
async def cleanup_expired_duels_endpoint(
    api_key: str = Depends(verify_api_key)
):
    """Clean up expired duels"""
    try:
        result = DuelOperations.cleanup_expired_duels()
        return {"success": True, "message": f"Cleaned up {result.get('count', 0)} expired duels"}
    except Exception as error:
        return {"success": False, "error": str(error)}