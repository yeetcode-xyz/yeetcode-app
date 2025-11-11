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
        if not cached_users or not cached_users.get('success'):
            error(f"No users in cache, cannot update {username}")
            return False

        users = cached_users.get('data', [])
        user = next((u for u in users if u.get('username') == username), None)

        if not user:
            error(f"User {username} not found in cache")
            return False

        # Apply updates to user
        for key, value in updates.items():
            user[key] = value

        # Write back to cache
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
