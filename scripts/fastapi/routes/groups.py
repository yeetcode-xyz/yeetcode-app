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

        # Invalidate GROUPS cache since a new group was created
        cache_manager.invalidate_all(CacheType.GROUPS)
        # NOTE: Do NOT invalidate USERS cache - create_group() uses cache-first writes

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

        # NOTE: Do NOT invalidate USERS cache - join_group() uses cache-first writes
        # Group metadata doesn't change when someone joins

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

        # NOTE: Do NOT invalidate USERS cache - leave_group() uses cache-first writes
        # Group metadata doesn't change when someone leaves

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
        # Check USERS cache first (this is where the actual stats are)
        cached_users = cache_manager.get(CacheType.USERS)
        if cached_users and cached_users.get('success'):
            # Filter users by group_id from cache
            users_in_group = []
            for user in cached_users.get('data', []):
                if user.get('group_id') == group_id:
                    # Build leaderboard entry from cached user data
                    display_name = user.get('display_name', user.get('username', ''))
                    if not display_name or display_name == 'undefined':
                        display_name = user.get('username', '')

                    users_in_group.append({
                        'username': user.get('username', ''),
                        'name': display_name,
                        'easy': int(user.get('easy', 0) or 0),
                        'medium': int(user.get('medium', 0) or 0),
                        'hard': int(user.get('hard', 0) or 0),
                        'today': int(user.get('today', 0) or 0),
                        'xp': int(user.get('xp', 0) or 0)
                    })

            if DEBUG_MODE:
                print(f"[DEBUG] Returning {len(users_in_group)} users from cache for group {group_id}")

            return {"success": True, "data": users_in_group}

        # Fallback to database only if cache miss
        if DEBUG_MODE:
            print(f"[DEBUG] Cache miss for group {group_id}, falling back to database")
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

        # NOTE: Do NOT invalidate cache - update_user_data() uses cache-first writes
        # The cache is automatically updated, no need to invalidate

        if DEBUG_MODE:
            print(f"[DEBUG] Updated display name for {request.username} to {request.display_name}")
        
        return {"success": success}
    except Exception as error:
        return {"success": False, "error": str(error)}


@router.get("/university-leaderboard")
async def get_university_leaderboard_endpoint(
    api_key: str = Depends(verify_api_key)
):
    """Get university leaderboard with aggregated stats"""
    try:
        # Check cache first
        cached_leaderboard = cache_manager.get(CacheType.UNIVERSITY_LEADERBOARD)
        if cached_leaderboard:
            return cached_leaderboard
        
        # Get all users to aggregate by university
        result = UserOperations.get_all_users_for_university_leaderboard()
        if not result.get("success"):
            return result
        
        # Aggregate users by university
        university_stats = {}
        for user in result.get("data", []):
            university = user.get("university")
            if not university or university == "undefined" or university == "" or university == "Other":
                continue
                
            if university not in university_stats:
                university_stats[university] = {
                    "university": university,
                    "students": 0,
                    "easy": 0,
                    "medium": 0,
                    "hard": 0,
                    "total": 0,
                    "total_xp": 0,
                    "top_student": None,
                    "top_student_xp": 0
                }
            
            stats = university_stats[university]
            stats["students"] += 1

            # Ensure all values are integers (they come as strings from DynamoDB)
            try:
                easy = int(user.get("easy", 0) or 0)
                medium = int(user.get("medium", 0) or 0)
                hard = int(user.get("hard", 0) or 0)
                xp = int(user.get("xp", 0) or 0)
            except (ValueError, TypeError):
                easy = medium = hard = xp = 0

            stats["easy"] += easy
            stats["medium"] += medium
            stats["hard"] += hard
            stats["total"] += easy + medium + hard

            # Calculate XP for this user
            user_xp = (easy * 100 + medium * 300 + hard * 500 + xp)

            stats["total_xp"] += user_xp
            
            # Track top student
            if user_xp > stats["top_student_xp"]:
                stats["top_student_xp"] = user_xp
                stats["top_student"] = user.get("username", "Unknown")
        
        # Convert to list and sort by total XP
        leaderboard = list(university_stats.values())
        leaderboard.sort(key=lambda x: x["total_xp"], reverse=True)
        
        response = {"success": True, "data": leaderboard}
        
        # Cache the result for 1 minute
        cache_manager.set(CacheType.UNIVERSITY_LEADERBOARD, response, ttl=60)
        
        return response
    except Exception as error:
        return {"success": False, "error": str(error)}


@router.get("/my-university-leaderboard/{username}")
async def get_my_university_leaderboard_endpoint(
    username: str,
    api_key: str = Depends(verify_api_key)
):
    """Get individual student rankings for the user's university"""
    try:
        # Get the user's university first
        user_data = UserOperations.get_user_data(username)
        if not user_data:
            return {"success": False, "error": "User not found"}

        user_university = user_data.get("university")
        if not user_university or user_university == "undefined" or user_university == "" or user_university == "Other":
            return {"success": False, "error": "User not enrolled in a university"}

        # Check cache first (cache key includes university)
        cache_key = f"my_university_{user_university}"
        cached_leaderboard = cache_manager.get(CacheType.UNIVERSITY_LEADERBOARD, cache_key)
        if cached_leaderboard:
            return cached_leaderboard

        # Get all users from the same university
        result = UserOperations.get_all_users_for_university_leaderboard()
        if not result.get("success"):
            return result

        # Filter users by university and calculate XP
        university_users = []
        for user in result.get("data", []):
            if user.get("university") == user_university:
                # Ensure all values are integers (they come as strings from DynamoDB)
                try:
                    easy = int(user.get("easy", 0) or 0)
                    medium = int(user.get("medium", 0) or 0)
                    hard = int(user.get("hard", 0) or 0)
                    xp = int(user.get("xp", 0) or 0)
                except (ValueError, TypeError):
                    easy = medium = hard = xp = 0

                user_xp = (easy * 100 + medium * 300 + hard * 500 + xp)

                university_users.append({
                    "username": user.get("username", ""),
                    "display_name": user.get("display_name", user.get("username", "")),
                    "easy": easy,
                    "medium": medium,
                    "hard": hard,
                    "xp": xp,
                    "total_xp": user_xp
                })

        # Sort by total XP descending
        university_users.sort(key=lambda x: x["total_xp"], reverse=True)

        response = {
            "success": True,
            "data": university_users,
            "university": user_university,
            "total_students": len(university_users)
        }

        # Cache the result for 1 minute (keyed by university)
        cache_manager.set(CacheType.UNIVERSITY_LEADERBOARD, response, identifier=cache_key, ttl=60)

        return response
    except Exception as error:
        return {"success": False, "error": str(error)}