"""
Bounty routes
"""

from fastapi import APIRouter, Depends

from ..models import BountyRequest
from ..auth import verify_api_key
from ..aws import BountyOperations

router = APIRouter(prefix="/api/v1", tags=["Bounties"])

DEBUG_MODE = False


@router.get("/bounties/{username}")
async def get_user_bounties_endpoint(
    username: str,
    api_key: str = Depends(verify_api_key)
):
    """Get bounties for a user"""
    try:
        result = BountyOperations.get_user_bounties(username)
        return result
    except Exception as error:
        return {"success": False, "error": str(error)}


@router.post("/complete-bounty")
async def complete_bounty_endpoint(
    request: BountyRequest,
    api_key: str = Depends(verify_api_key)
):
    """Complete a bounty for a user"""
    try:
        result = BountyOperations.complete_bounty(request.username, request.bounty_id)
        return result
    except Exception as error:
        return {"success": False, "error": str(error)}


@router.post("/update-bounty-progress")
async def update_bounty_progress_endpoint(
    request: dict,
    api_key: str = Depends(verify_api_key)
):
    """Update bounty progress for a user"""
    try:
        username = request.get('username')
        bounty_id = request.get('bounty_id')
        progress = request.get('progress', 0)
        
        if not username or not bounty_id:
            return {"success": False, "error": "Username and bounty_id required"}
        
        result = BountyOperations.update_bounty_progress(username, bounty_id, progress)
        return result
    except Exception as error:
        return {"success": False, "error": str(error)}