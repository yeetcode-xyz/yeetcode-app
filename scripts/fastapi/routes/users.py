"""
User routes
"""

from fastapi import APIRouter, Depends
from typing import Dict

from ..models import UserData
from ..auth import verify_api_key
from ..aws import UserOperations

router = APIRouter(tags=["Users"])

DEBUG_MODE = False


@router.get("/user/{username}")
async def get_user_endpoint(
    username: str,
    api_key: str = Depends(verify_api_key)
):
    """Get user data from DynamoDB"""
    try:
        user_data = UserOperations.get_user_data(username)
        if user_data:
            return {"success": True, "data": user_data}
        else:
            return {"success": False, "error": "User not found"}
    except Exception as error:
        return {"success": False, "error": str(error)}


@router.put("/user/{username}")
async def update_user_endpoint(
    username: str,
    user_data: UserData,
    api_key: str = Depends(verify_api_key)
):
    """Update user data in DynamoDB"""
    try:
        updates = {}
        if user_data.display_name is not None:
            updates['display_name'] = {'S': user_data.display_name}
        if user_data.email is not None:
            updates['email'] = {'S': user_data.email.lower()}
        if user_data.group_id is not None:
            updates['group_id'] = {'S': user_data.group_id}
            
        success = UserOperations.update_user_data(username, updates)
        return {"success": success, "message": "User updated successfully"}
    except Exception as error:
        return {"success": False, "error": str(error)}


@router.get("/user-data/{username}")
async def get_user_data_endpoint(
    username: str,
    api_key: str = Depends(verify_api_key)
):
    """Get user data"""
    try:
        user_data = UserOperations.get_user_data(username)
        if user_data:
            return {"success": True, "data": user_data}
        else:
            return {"success": False, "error": "User not found"}
    except Exception as error:
        return {"success": False, "error": str(error)}


@router.put("/user-data/{username}")
async def update_user_data_endpoint(
    username: str,
    user_data: Dict,
    api_key: str = Depends(verify_api_key)
):
    """Update user data"""
    try:
        # Build update expression dynamically
        updates = {}
        
        for key, value in user_data.items():
            if key != 'username':  # Don't update username
                updates[key] = {'S': str(value)} if isinstance(value, str) else {'N': str(value)}
        
        success = UserOperations.update_user_data(username, updates)
        return {"success": success}
    except Exception as error:
        return {"success": False, "error": str(error)}


@router.post("/award-xp")
async def award_xp_endpoint(
    request: dict,
    api_key: str = Depends(verify_api_key)
):
    """Award XP to a user"""
    try:
        username = request.get('username')
        xp_amount = request.get('xp_amount', 0)
        
        if not username:
            return {"success": False, "error": "Username required"}
        
        success = UserOperations.award_xp(username, xp_amount)
        return {"success": success}
    except Exception as error:
        return {"success": False, "error": str(error)}