"""
User routes
"""

from fastapi import APIRouter, Depends
from typing import Dict
from pydantic import BaseModel

from models import UserData
from auth import verify_api_key
from aws import UserOperations
from cache_manager import cache_manager, CacheType

router = APIRouter(tags=["Users"])

DEBUG_MODE = False

class CreateUserRequest(BaseModel):
    username: str
    email: str
    display_name: str = None
    university: str = None


@router.get("/user/{username}")
async def get_user_endpoint(
    username: str,
    api_key: str = Depends(verify_api_key)
):
    """Get user data from DynamoDB"""
    try:
        # Check cache first for user data
        cached_users = cache_manager.get(CacheType.USERS)
        if cached_users:
            user_data = cached_users.get('data', {}).get(username)
            if user_data:
                return {"success": True, "data": user_data}
        
        # Fallback to database
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
        
        # Invalidate cache to force refresh
        cache_manager.invalidate_all(CacheType.USERS)
        
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
        # Check cache first for user data
        cached_users = cache_manager.get(CacheType.USERS)
        if cached_users:
            user_data = cached_users.get('data', {}).get(username)
            if user_data:
                return {"success": True, "data": user_data}
        
        # Fallback to database
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
        
        # Invalidate cache to force refresh
        cache_manager.invalidate_all(CacheType.USERS)
        
        return {"success": success}
    except Exception as error:
        return {"success": False, "error": str(error)}


@router.post("/create-user-with-username")
async def create_user_with_username_endpoint(
    request: CreateUserRequest,
    api_key: str = Depends(verify_api_key)
):
    """Create a new user with specific username and email"""
    try:
        username = request.username
        email = request.email
        display_name = request.display_name
        university = request.university
        
        if DEBUG_MODE:
            print(f"[DEBUG] Creating user with username: {username}, email: {email}, display_name: {display_name}, university: {university}")
        
        result = UserOperations.create_user_with_username(username, email, display_name, university)
        
        # Invalidate cache to force refresh
        cache_manager.invalidate_all(CacheType.USERS)
        
        return {"success": True, "data": result}
    except Exception as error:
        if DEBUG_MODE:
            print(f"[ERROR] Failed to create user: {error}")
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
        
        if not username or xp_amount <= 0:
            return {"success": False, "error": "Username and positive XP amount required"}
        
        success = UserOperations.award_xp(username, xp_amount)
        
        # Invalidate cache to force refresh
        cache_manager.invalidate_all(CacheType.USERS)
        
        return {"success": success, "message": f"Awarded {xp_amount} XP to {username}"}
    except Exception as error:
        return {"success": False, "error": str(error)}


@router.get("/leaderboard")
async def get_leaderboard_endpoint(
    api_key: str = Depends(verify_api_key)
):
    """Get leaderboard data"""
    try:
        # Check cache first for users data
        cached_users = cache_manager.get(CacheType.USERS)
        if cached_users:
            return cached_users
        
        # Fallback to database
        result = UserOperations.get_leaderboard()
        return result
    except Exception as error:
        return {"success": False, "error": str(error)}




@router.get("/user-by-email/{email}")
async def get_user_by_email_endpoint(
    email: str,
    api_key: str = Depends(verify_api_key)
):
    """Get user data by email address"""
    try:
        # Check cache first for users data
        cached_users = cache_manager.get(CacheType.USERS)
        if cached_users:
            # Find user by email in cached data
            for user in cached_users.get('data', []):
                if user.get('email', '').lower() == email.lower():
                    return {"success": True, "data": user}
        
        # Fallback to database
        result = UserOperations.get_user_by_email(email)
        if result:
            if DEBUG_MODE:
                print(f"[DEBUG] User found by email: {result}")
                print(f"[DEBUG] User username: {result.get('username')}, email: {result.get('email')}")
                print(f"[DEBUG] User has group_id: {result.get('group_id')}")
            return {"success": True, "data": result}
        else:
            if DEBUG_MODE:
                print(f"[DEBUG] No user found for email: {email}")
            return {"success": False, "error": "User not found"}
    except Exception as error:
        return {"success": False, "error": str(error)}


@router.get("/group/{group_id}")
async def get_group_users_endpoint(
    group_id: str,
    api_key: str = Depends(verify_api_key)
):
    """Get users in a specific group"""
    try:
        # Check cache first for users data
        cached_users = cache_manager.get(CacheType.USERS)
        if cached_users:
            group_users = [
                user for user in cached_users.get('data', []) 
                if user.get('group_id') == group_id
            ]
            return {"success": True, "data": group_users}
        
        # Fallback to database
        result = UserOperations.get_group_users(group_id)
        return result
    except Exception as error:
        return {"success": False, "error": str(error)}