"""
Bounty routes
"""

from fastapi import APIRouter, Depends

from ..models import BountyRequest
from ..auth import verify_api_key
from ..aws import BountyOperations

router = APIRouter(tags=["Bounties"])

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

