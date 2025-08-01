"""
Group routes
"""

from fastapi import APIRouter, Depends

from models import GroupRequest, JoinGroupRequest
from auth import verify_api_key
from aws import GroupOperations, UserOperations
from cache_manager import cache_manager, CacheType

router = APIRouter(tags=["Groups"])

DEBUG_MODE = False


@router.post("/create-group")
async def create_group_endpoint(
    request: GroupRequest,
    api_key: str = Depends(verify_api_key)
):
    """Create a new group and assign user as group leader"""
    try:
        result = GroupOperations.create_group(request.username, request.display_name)
        
        # Invalidate cache to force refresh
        cache_manager.invalidate_all(CacheType.GROUPS)
        cache_manager.invalidate_all(CacheType.USERS)
        
        return result
    except Exception as error:
        return {"success": False, "error": str(error)}


@router.post("/join-group")
async def join_group_endpoint(
    request: JoinGroupRequest,
    api_key: str = Depends(verify_api_key)
):
    """Join an existing group using invite code"""
    try:
        result = GroupOperations.join_group(
            request.username, 
            request.invite_code, 
            request.display_name
        )
        
        # Invalidate cache to force refresh
        cache_manager.invalidate_all(CacheType.GROUPS)
        cache_manager.invalidate_all(CacheType.USERS)
        
        return result
    except Exception as error:
        return {"success": False, "error": str(error)}


@router.post("/leave-group")
async def leave_group_endpoint(
    request: GroupRequest,
    api_key: str = Depends(verify_api_key)
):
    """Leave the current group"""
    try:
        result = GroupOperations.leave_group(request.username)
        
        # Invalidate cache to force refresh
        cache_manager.invalidate_all(CacheType.GROUPS)
        cache_manager.invalidate_all(CacheType.USERS)
        
        return result
    except Exception as error:
        return {"success": False, "error": str(error)}


@router.get("/group-stats/{group_id}")
async def get_group_stats_endpoint(
    group_id: str,
    api_key: str = Depends(verify_api_key)
):
    """Get leaderboard stats for a group"""
    try:
        # Check cache first for groups
        cached_groups = cache_manager.get(CacheType.GROUPS)
        if cached_groups:
            for group in cached_groups.get('data', []):
                if group.get('id') == group_id:
                    return {"success": True, "data": group}
        
        # Fallback to database
        result = GroupOperations.get_group_stats(group_id)
        return result
    except Exception as error:
        return {"success": False, "error": str(error)}


@router.get("/all-groups")
async def get_all_groups_endpoint(
    api_key: str = Depends(verify_api_key)
):
    """Get all groups"""
    try:
        # Check cache first for groups
        cached_groups = cache_manager.get(CacheType.GROUPS)
        if cached_groups:
            return cached_groups
        
        # Fallback to database
        result = GroupOperations.get_all_groups()
        return result
    except Exception as error:
        return {"success": False, "error": str(error)}


@router.get("/group/{group_id}")
async def get_group_endpoint(
    group_id: str,
    api_key: str = Depends(verify_api_key)
):
    """Get specific group by ID"""
    try:
        # Check cache first for groups
        cached_groups = cache_manager.get(CacheType.GROUPS)
        if cached_groups:
            for group in cached_groups.get('data', []):
                if group.get('id') == group_id:
                    return {"success": True, "data": group}
        
        # Fallback to database
        result = GroupOperations.get_group_by_id(group_id)
        return result
    except Exception as error:
        return {"success": False, "error": str(error)}


@router.put("/update-display-name")
async def update_display_name_endpoint(
    request: GroupRequest,
    api_key: str = Depends(verify_api_key)
):
    """Update user's display name"""
    try:
        if not request.display_name or not request.display_name.strip():
            return {"success": False, "error": "No display name provided"}
        
        updates = {'display_name': {'S': request.display_name}}
        success = UserOperations.update_user_data(request.username, updates)
        
        # Invalidate cache to force refresh
        cache_manager.invalidate_all(CacheType.USERS)
        
        if DEBUG_MODE:
            print(f"[DEBUG] Updated display name for {request.username} to {request.display_name}")
        
        return {"success": success}
    except Exception as error:
        return {"success": False, "error": str(error)}