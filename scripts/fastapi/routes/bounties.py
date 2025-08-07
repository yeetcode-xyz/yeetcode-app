"""
Bounty routes
"""

from fastapi import APIRouter, Depends

from models import BountyRequest
from auth import verify_api_key
from aws import BountyOperations
from cache_manager import cache_manager, CacheType

router = APIRouter(tags=["Bounties"])

DEBUG_MODE = False


@router.get("/bounties/{username}")
async def get_user_bounties_endpoint(
    username: str,
    api_key: str = Depends(verify_api_key),
    refresh: bool = False
):
    """Get bounties for a user"""
    try:
        # If refresh is requested, invalidate caches first
        if refresh:
            cache_manager.invalidate_all(CacheType.BOUNTY_COMPETITIONS)
        
        # Check cache first for bounties
        cached_bounties = cache_manager.get(CacheType.BOUNTIES)
        cached_competitions = cache_manager.get(CacheType.BOUNTY_COMPETITIONS)
        
        if cached_bounties and cached_competitions and not refresh:
            # Use cached data
            bounties_data = cached_bounties.get('data', [])
            competitions_data = cached_competitions
            
            # Filter bounties for this user
            user_bounties = []
            for bounty in bounties_data:
                bounty_id = bounty.get('id')
                if bounty_id and bounty_id in competitions_data:
                    user_progress = competitions_data[bounty_id].get('data', {}).get(username, {})
                    bounty['user_progress'] = user_progress
                user_bounties.append(bounty)
            
            return {
                "success": True,
                "data": user_bounties
            }
        
        # Fallback to database (or forced refresh)
        result = BountyOperations.get_user_bounties(username)
        return result
    except Exception as error:
        return {"success": False, "error": str(error)}


@router.get("/all-bounties")
async def get_all_bounties_endpoint(
    api_key: str = Depends(verify_api_key)
):
    """Get all bounties"""
    try:
        # Check cache first for bounties
        cached_bounties = cache_manager.get(CacheType.BOUNTIES)
        if cached_bounties:
            return cached_bounties
        
        # Fallback to database
        result = BountyOperations.get_all_bounties()
        return result
    except Exception as error:
        return {"success": False, "error": str(error)}


@router.get("/bounty/{bounty_id}")
async def get_bounty_endpoint(
    bounty_id: str,
    api_key: str = Depends(verify_api_key)
):
    """Get specific bounty by ID"""
    try:
        # Check cache first for bounties
        cached_bounties = cache_manager.get(CacheType.BOUNTIES)
        if cached_bounties:
            for bounty in cached_bounties.get('data', []):
                if bounty.get('id') == bounty_id:
                    return {"success": True, "data": bounty}
        
        # Fallback to database
        result = BountyOperations.get_bounty_by_id(bounty_id)
        return result
    except Exception as error:
        return {"success": False, "error": str(error)}


@router.get("/bounty-progress/{bounty_id}")
async def get_bounty_progress_endpoint(
    bounty_id: str,
    api_key: str = Depends(verify_api_key)
):
    """Get progress for a specific bounty"""
    try:
        # Check cache first for bounty competitions
        cached_competitions = cache_manager.get(CacheType.BOUNTY_COMPETITIONS)
        if cached_competitions and bounty_id in cached_competitions:
            return cached_competitions[bounty_id]
        
        # Fallback to database
        result = BountyOperations.get_bounty_progress(bounty_id)
        return result
    except Exception as error:
        return {"success": False, "error": str(error)}


@router.post("/refresh-bounty-cache")
async def refresh_bounty_cache_endpoint(
    api_key: str = Depends(verify_api_key)
):
    """Force refresh bounty and bounty competition caches"""
    try:
        # Invalidate both bounty caches
        cache_manager.invalidate_all(CacheType.BOUNTIES)
        cache_manager.invalidate_all(CacheType.BOUNTY_COMPETITIONS)
        
        return {"success": True, "message": "Bounty caches refreshed"}
    except Exception as error:
        return {"success": False, "error": str(error)}
