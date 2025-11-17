"""
Cache Operations Helper for YeetCode FastAPI

Provides helper functions to write to cache instead of DB.
Maps DynamoDB operations to cache-first writes with WAL.
"""

import os
from typing import Dict, Optional
from cache_manager import cache_manager, CacheType
from logger import error

# Table names from environment
USERS_TABLE = os.environ.get('USERS_TABLE', 'Yeetcode_users')
DAILY_TABLE = os.environ.get('DAILY_TABLE', 'Daily')
DUELS_TABLE = os.environ.get('DUELS_TABLE', 'Duels')
BOUNTIES_TABLE = os.environ.get('BOUNTIES_TABLE', 'Bounties')


def update_user_in_cache(username: str, updates: Dict) -> bool:
    """
    Update user data in cache (replaces DynamoDB update_item)

    Args:
        username: Username (lowercase)
        updates: Dict of fields to update

    Returns:
        True if successful
    """
    try:
        # Get current user data from cache
        cached_users = cache_manager.get(CacheType.USERS)

        # If cache is empty, reload from database
        if not cached_users or not cached_users.get('success'):
            import os
            from aws import ddb, normalize_dynamodb_item
            from logger import info

            table_name = os.environ.get('USERS_TABLE', 'Yeetcode_users')
            scan_result = ddb.scan(TableName=table_name)
            all_users = scan_result.get('Items', [])
            normalized_users = [normalize_dynamodb_item(user) for user in all_users]

            cached_users = {"success": True, "data": normalized_users}
            cache_manager.set(CacheType.USERS, cached_users)

            info(f"Reloaded {len(normalized_users)} users into cache")

        # Hold lock for entire operation to prevent lost updates from concurrent threads
        with cache_manager._lock:
            users = cached_users.get('data', [])
            user = next((u for u in users if u.get('username') == username), None)

            if not user:
                # User not in cache - try fetching from DB
                # Re-check if user was added by concurrent request
                re_fetched = cache_manager.get(CacheType.USERS)
                if re_fetched and re_fetched.get('success'):
                    # Cache was refreshed, use the new data
                    cached_users = re_fetched
                    users = cached_users.get('data', [])
                    user = next((u for u in users if u.get('username') == username), None)

                if not user:
                    # Still not found after re-check - fetch from database
                    from aws import UserOperations
                    from logger import info

                    user = UserOperations.get_user_data(username)
                    if user:
                        info(f"User {username} fetched from DB and added to cache")
                        # Ensure cached_users is a valid dict before assignment
                        if not cached_users or not isinstance(cached_users, dict):
                            cached_users = {"success": True, "data": []}
                        if 'data' not in cached_users:
                            cached_users['data'] = []
                        # Add user to in-memory list (write() below handles cache update + WAL)
                        users = cached_users['data']
                        users.append(user)
                        cached_users['data'] = users
                    else:
                        error(f"User {username} not found in cache or database")
                        return False

            # Apply updates to user
            for key, value in updates.items():
                user[key] = value

            # Write back to cache (still inside lock to prevent lost updates)
            return cache_manager.write(
                cache_type=CacheType.USERS,
                data=cached_users,
                wal_operation={
                    "operation": "UPDATE",
                    "table": USERS_TABLE,
                    "key": {"username": username},
                    "data": user
                }
            )

    except Exception as e:
        error(f"Failed to update user in cache: {e}")
        return False


def award_xp_in_cache(username: str, xp_amount: int) -> bool:
    """
    Award XP to user in cache (replaces DynamoDB atomic increment)

    Args:
        username: Username
        xp_amount: XP to award

    Returns:
        True if successful
    """
    try:
        # Get current user data
        cached_users = cache_manager.get(CacheType.USERS)
        if not cached_users or not cached_users.get('success'):
            return False

        users = cached_users.get('data', [])
        user = next((u for u in users if u.get('username') == username), None)

        if not user:
            return False

        # Increment XP
        current_xp = user.get('xp', 0)
        user['xp'] = current_xp + xp_amount

        # Write back to cache
        return cache_manager.write(
            cache_type=CacheType.USERS,
            data=cached_users,
            wal_operation={
                "operation": "INCREMENT",
                "table": USERS_TABLE,
                "key": {"username": username},
                "data": {"xp": xp_amount}
            }
        )

    except Exception as e:
        error(f"Failed to award XP in cache: {e}")
        return False


def complete_daily_in_cache(username: str, date: str) -> bool:
    """
    Mark user as having completed daily problem in cache

    Args:
        username: Username
        date: Date string (YYYY-MM-DD)

    Returns:
        True if successful
    """
    try:
        # Update user's 'today' field
        cached_users = cache_manager.get(CacheType.USERS)
        if cached_users and cached_users.get('success'):
            users = cached_users.get('data', [])
            user = next((u for u in users if u.get('username') == username), None)
            if user:
                user['today'] = 1

                cache_manager.write(
                    cache_type=CacheType.USERS,
                    data=cached_users,
                    wal_operation={
                        "operation": "UPDATE",
                        "table": USERS_TABLE,
                        "key": {"username": username},
                        "data": {"today": 1}
                    }
                )

        # Update daily completions cache
        cached_daily = cache_manager.get(CacheType.DAILY_PROBLEM)
        if cached_daily and cached_daily.get('success'):
            daily_data = cached_daily.get('data', {})
            if daily_data.get('date') == date:
                if 'users' not in daily_data:
                    daily_data['users'] = {}
                daily_data['users'][username] = True

                cache_manager.write(
                    cache_type=CacheType.DAILY_PROBLEM,
                    data=cached_daily,
                    wal_operation={
                        "operation": "UPDATE",
                        "table": DAILY_TABLE,
                        "key": {"date": date},
                        "data": {"users": {username: True}}
                    }
                )

        return True

    except Exception as e:
        error(f"Failed to mark daily complete in cache: {e}")
        return False


def update_bounty_in_cache(bounty_id: str, username: str, progress: int) -> bool:
    """
    Update user's bounty progress in cache

    Args:
        bounty_id: Bounty ID
        username: Username
        progress: New progress value

    Returns:
        True if successful
    """
    try:
        cached_bounties = cache_manager.get(CacheType.BOUNTIES)
        if not cached_bounties or not cached_bounties.get('success'):
            return False

        bounties = cached_bounties.get('data', [])
        bounty = next((b for b in bounties if b.get('id') == bounty_id), None)

        if not bounty:
            return False

        # Update user progress
        if 'users' not in bounty:
            bounty['users'] = {}
        bounty['users'][username] = progress

        # Write back to cache
        return cache_manager.write(
            cache_type=CacheType.BOUNTIES,
            data=cached_bounties,
            wal_operation={
                "operation": "UPDATE",
                "table": BOUNTIES_TABLE,
                "key": {"id": bounty_id},
                "data": {"users": {username: progress}}
            }
        )

    except Exception as e:
        error(f"Failed to update bounty in cache: {e}")
        return False


def create_group_in_cache(group_id: str, leader: str, display_name: str = None) -> bool:
    """
    Create a new group in cache

    Args:
        group_id: Group ID (5-digit code)
        leader: Leader username
        display_name: Display name for leader

    Returns:
        True if successful
    """
    try:
        # Update user's group_id and display_name
        updates = {"group_id": group_id}
        if display_name:
            updates["display_name"] = display_name
        return update_user_in_cache(leader, updates)

    except Exception as e:
        error(f"Failed to create group in cache: {e}")
        return False


def join_group_in_cache(username: str, group_id: str, display_name: str = None) -> bool:
    """
    User joins a group in cache

    Args:
        username: Username
        group_id: Group ID
        display_name: Display name for user

    Returns:
        True if successful
    """
    try:
        updates = {"group_id": group_id}
        if display_name:
            updates["display_name"] = display_name
        return update_user_in_cache(username, updates)

    except Exception as e:
        error(f"Failed to join group in cache: {e}")
        return False


def leave_group_in_cache(username: str) -> bool:
    """
    User leaves their group in cache

    Args:
        username: Username

    Returns:
        True if successful
    """
    try:
        return update_user_in_cache(username, {"group_id": ""})

    except Exception as e:
        error(f"Failed to leave group in cache: {e}")
        return False


def update_duel_in_cache(duel_id: str, updates: Dict) -> bool:
    """
    Update duel data in cache

    Args:
        duel_id: Duel ID
        updates: Dict of fields to update

    Returns:
        True if successful
    """
    try:
        cached_duels = cache_manager.get(CacheType.DUELS)
        if not cached_duels or not cached_duels.get('success'):
            return False

        duels = cached_duels.get('data', [])
        duel = next((d for d in duels if d.get('duelId') == duel_id), None)

        if not duel:
            return False

        # Apply updates
        for key, value in updates.items():
            duel[key] = value

        # Write back to cache
        return cache_manager.write(
            cache_type=CacheType.DUELS,
            data=cached_duels,
            wal_operation={
                "operation": "UPDATE",
                "table": DUELS_TABLE,
                "key": {"duelId": duel_id},
                "data": duel
            }
        )

    except Exception as e:
        error(f"Failed to update duel in cache: {e}")
        return False


def create_duel_in_cache(duel_data: Dict) -> bool:
    """
    Create a new duel in cache

    Args:
        duel_data: Complete duel data dict

    Returns:
        True if successful
    """
    try:
        cached_duels = cache_manager.get(CacheType.DUELS)
        if not cached_duels:
            cached_duels = {"success": True, "data": []}

        duels = cached_duels.get('data', [])
        duels.append(duel_data)
        cached_duels['data'] = duels

        # Write to cache
        return cache_manager.write(
            cache_type=CacheType.DUELS,
            data=cached_duels,
            wal_operation={
                "operation": "PUT",
                "table": DUELS_TABLE,
                "key": {"duelId": duel_data.get('duelId')},
                "data": duel_data
            }
        )

    except Exception as e:
        error(f"Failed to create duel in cache: {e}")
        return False


def delete_duel_from_cache(duel_id: str) -> bool:
    """
    Delete a duel from cache

    Args:
        duel_id: Duel ID

    Returns:
        True if successful
    """
    try:
        cached_duels = cache_manager.get(CacheType.DUELS)
        if not cached_duels or not cached_duels.get('success'):
            return False

        duels = cached_duels.get('data', [])
        duels = [d for d in duels if d.get('duelId') != duel_id]
        cached_duels['data'] = duels

        # Write back to cache
        return cache_manager.write(
            cache_type=CacheType.DUELS,
            data=cached_duels,
            wal_operation={
                "operation": "DELETE",
                "table": DUELS_TABLE,
                "key": {"duelId": duel_id},
                "data": {}
            }
        )

    except Exception as e:
        error(f"Failed to delete duel from cache: {e}")
        return False

