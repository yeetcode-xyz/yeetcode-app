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

        # Pre-check cache and fetch from DB if needed (OUTSIDE lock to avoid blocking)
        users = cached_users.get('data', [])
        user = next((u for u in users if u.get('username') == username), None)

        user_from_db = None
        if not user:
            # User not in cache - fetch from DB before acquiring lock
            from aws import UserOperations
            from logger import info

            user_from_db = UserOperations.get_user_data(username)
            if not user_from_db:
                error(f"User {username} not found in cache or database")
                return False

        # Hold lock for entire update operation to prevent lost updates
        with cache_manager._lock:
            # Re-fetch cache inside lock (might have been updated by another thread)
            cached_users = cache_manager.get(CacheType.USERS)
            if not cached_users or not cached_users.get('success'):
                error(f"Cache unavailable for user {username}")
                return False

            users = cached_users.get('data', [])
            user = next((u for u in users if u.get('username') == username), None)

            # If user still not in cache but we fetched from DB, add them
            if not user and user_from_db:
                info(f"User {username} fetched from DB and added to cache")
                users.append(user_from_db)
                cached_users['data'] = users
                user = user_from_db

            if not user:
                error(f"User {username} not found in cache")
                return False

            # Apply updates to user
            for key, value in updates.items():
                user[key] = value

            # Write back to cache (still inside lock to prevent lost updates)
            # Only send updated fields in WAL to prevent overwriting other fields (e.g., XP)
            return cache_manager.write(
                cache_type=CacheType.USERS,
                data=cached_users,
                wal_operation={
                    "operation": "UPDATE",
                    "table": USERS_TABLE,
                    "key": {"username": username},
                    "data": {k: user[k] for k in updates.keys()}
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
    Also updates user's streak

    Args:
        username: Username
        date: Date string (YYYY-MM-DD)

    Returns:
        True if successful
    """
    try:
        # Update user's 'today' field and calculate new streak
        cached_users = cache_manager.get(CacheType.USERS)
        if cached_users and cached_users.get('success'):
            users = cached_users.get('data', [])
            user = next((u for u in users if u.get('username') == username), None)
            if user:
                user['today'] = 1

                # Calculate and update streak
                from datetime import datetime, timedelta
                today_date = datetime.strptime(date, '%Y-%m-%d')
                yesterday_date = (today_date - timedelta(days=1)).strftime('%Y-%m-%d')

                # Get user's current streak and last completed date
                # Check user object first (already have it), then USER_DAILY_DATA cache
                current_streak = user.get('streak', 0)
                last_completed_date = user.get('last_completed_date')

                # If not in user object, check USER_DAILY_DATA cache
                if not last_completed_date:
                    cached_user_data = cache_manager.get(CacheType.USER_DAILY_DATA, username)
                    if cached_user_data:
                        current_streak = cached_user_data.get('streak', 0)
                        last_completed_date = cached_user_data.get('last_completed_date')

                # Check if user completed yesterday to determine streak continuation
                if last_completed_date == yesterday_date:
                    # User completed yesterday - continue streak
                    new_streak = current_streak + 1
                elif last_completed_date == date:
                    # Already completed today - don't change streak
                    new_streak = current_streak
                else:
                    # Streak broken or starting new - reset to 1
                    new_streak = 1

                # Update user data with streak and last_completed_date
                user['streak'] = new_streak
                user['last_completed_date'] = date

                # Write to cache with WAL to persist streak data to database
                cache_manager.write(
                    cache_type=CacheType.USERS,
                    data=cached_users,
                    wal_operation={
                        "operation": "UPDATE",
                        "table": USERS_TABLE,
                        "key": {"username": username},
                        "data": {
                            "today": 1,
                            "streak": new_streak,
                            "last_completed_date": date
                        }
                    }
                )

                # Also update USER_DAILY_DATA cache for faster reads
                cache_manager.set(
                    CacheType.USER_DAILY_DATA,
                    {'streak': new_streak, 'last_completed_date': date},
                    username
                )

                # Award XP for daily completion (200 XP)
                # CRITICAL: This was missing after cache-first migration, causing users to get 0 XP
                award_xp_in_cache(username, 200)

        # Update BOTH daily problem cache AND daily completions cache
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

        # Also update DAILY_COMPLETIONS cache (used by GET endpoint)
        cached_completions = cache_manager.get(CacheType.DAILY_COMPLETIONS)
        if cached_completions:
            comp_data = cached_completions.get('data', {})
            if comp_data.get('problem_date') == date:
                if 'users' not in comp_data:
                    comp_data['users'] = {}
                comp_data['users'][username] = True

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

        # If cache is empty, load duels from DB first
        if not cached_duels or not cached_duels.get('success'):
            from aws import DuelOperations
            duels_result = DuelOperations.get_all_duels()
            if not duels_result.get('success'):
                error("Failed to load duels from DB, cannot update in cache")
                return False
            cached_duels = duels_result
            # Set in cache for future use
            cache_manager.set(CacheType.DUELS, cached_duels)

        duels = cached_duels.get('data', [])
        duel = next((d for d in duels if d.get('duelId') == duel_id), None)

        if not duel:
            error(f"Duel {duel_id} not found in cache after loading from DB")
            return False

        # Apply updates
        for key, value in updates.items():
            duel[key] = value

        # Write back to cache
        # Only send updated fields in WAL to prevent type mismatch errors
        return cache_manager.write(
            cache_type=CacheType.DUELS,
            data=cached_duels,
            wal_operation={
                "operation": "UPDATE",
                "table": DUELS_TABLE,
                "key": {"duelId": duel_id},
                "data": updates  # Only write the fields that were actually updated
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

