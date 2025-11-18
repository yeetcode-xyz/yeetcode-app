"""
Cache Manager for FastAPI - Server-side caching system
"""

import os
import time
import threading
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from enum import Enum
from logger import debug, info, cache_operation

# Import AWS operations and utilities
from aws import (
    BountyOperations, 
    DailyProblemOperations, 
    UserOperations, 
    DuelOperations,
    GroupOperations,
    normalize_dynamodb_item,
    USERS_TABLE,
    GROUPS_TABLE,
    DUELS_TABLE,
    ddb
)

DEBUG_MODE = os.getenv("DEBUG_MODE", "false").lower() == "true"


class CacheType(Enum):
    BOUNTIES = "bounties"
    BOUNTY_COMPETITIONS = "bounty_competitions"
    DAILY_PROBLEM = "daily_problem"
    DAILY_COMPLETIONS = "daily_completions"
    USERS = "users"
    DUELS = "duels"
    GROUPS = "groups"
    UNIVERSITY_LEADERBOARD = "university_leaderboard"
    USER_DAILY_DATA = "user_daily_data"  # Cache for user streak data


@dataclass
class CacheEntry:
    data: Any
    timestamp: float
    ttl: int  # Time to live in seconds
    dirty: bool = False  # Track if modified since last DB sync
    last_synced: float = 0.0  # Last DB sync timestamp


class CacheManager:
    def __init__(self):
        self._cache: Dict[str, CacheEntry] = {}
        self._lock = threading.RLock()
        self._refresh_thread = None
        self._stop_refresh = False
        self._last_daily_refresh = None  # Track last daily refresh
        self._wal_manager = None  # WAL manager instance (injected later)
        
        # Cache configuration
        self._cache_config = {
            CacheType.BOUNTIES: {"ttl": 86400, "refresh_interval": 86400},  # 24 hours
            CacheType.BOUNTY_COMPETITIONS: {"ttl": 60, "refresh_interval": None},  # 1 minute, no auto-refresh
            CacheType.DAILY_PROBLEM: {"ttl": 86400, "refresh_interval": 86400},  # 24 hours (refreshed at 12:02 AM UTC)
            CacheType.DAILY_COMPLETIONS: {"ttl": 60, "refresh_interval": None},  # 1 minute, no auto-refresh
            CacheType.USERS: {"ttl": 300, "refresh_interval": None},  # 5 minutes, no auto-refresh (cache-first writes keep it fresh)
            CacheType.DUELS: {"ttl": 60, "refresh_interval": None},  # 1 minute, no auto-refresh
            CacheType.GROUPS: {"ttl": 60, "refresh_interval": None},  # 1 minute, no auto-refresh
            CacheType.UNIVERSITY_LEADERBOARD: {"ttl": 60, "refresh_interval": None},  # 1 minute, no auto-refresh
            CacheType.USER_DAILY_DATA: {"ttl": 60, "refresh_interval": None},  # 1 minute, no auto-refresh
        }
        
        # Start background refresh thread
        self._start_refresh_thread()
    
    def _get_cache_key(self, cache_type: CacheType, identifier: str = "") -> str:
        """Generate cache key for given type and identifier"""
        return f"{cache_type.value}:{identifier}" if identifier else cache_type.value
    
    def _is_expired(self, entry: CacheEntry) -> bool:
        """Check if cache entry is expired"""
        return time.time() - entry.timestamp > entry.ttl
    
    def get(self, cache_type: CacheType, identifier: str = "") -> Optional[Any]:
        """Get cached data if not expired"""
        with self._lock:
            key = self._get_cache_key(cache_type, identifier)
            entry = self._cache.get(key)
            
            if entry and not self._is_expired(entry):
                cache_operation("Hit", key)
                return entry.data
            
            cache_operation("Miss", key)
            return None
    
    def set(self, cache_type: CacheType, data: Any, identifier: str = "", ttl: Optional[int] = None) -> None:
        """Set cache data with TTL"""
        with self._lock:
            key = self._get_cache_key(cache_type, identifier)
            ttl = ttl if ttl is not None else self._cache_config[cache_type]["ttl"]
            entry = CacheEntry(data=data, timestamp=time.time(), ttl=ttl)
            self._cache[key] = entry
            
            cache_operation("Set", key, ttl=ttl)
    
    def invalidate(self, cache_type: CacheType, identifier: str = "") -> None:
        """Invalidate specific cache entry - WARNING: may lose dirty data if not dumped"""
        with self._lock:
            key = self._get_cache_key(cache_type, identifier)
            if key in self._cache:
                entry = self._cache[key]
                # CRITICAL: Check if entry has unsaved changes before deletion
                if entry.dirty:
                    from logger import warning
                    warning(f"⚠️ Invalidating dirty cache entry: {key} - data may be lost if not dumped!")
                    # TODO: Consider triggering immediate dump for this entry
                del self._cache[key]
                if DEBUG_MODE:
                    print(f"[CACHE] Invalidated {key}")
    
    def invalidate_all(self, cache_type: CacheType) -> None:
        """Invalidate all entries of a specific cache type - WARNING: may lose dirty data if not dumped"""
        with self._lock:
            prefix = f"{cache_type.value}:"
            keys_to_remove = [key for key in self._cache.keys() if key.startswith(prefix)]

            # CRITICAL: Check for dirty entries before deletion
            dirty_count = 0
            for key in keys_to_remove:
                entry = self._cache[key]
                if entry.dirty:
                    dirty_count += 1

            if dirty_count > 0:
                from logger import warning
                warning(f"⚠️ Invalidating {dirty_count} dirty cache entries in {cache_type.value} - data may be lost if not dumped!")
                # TODO: Consider triggering immediate dump for dirty entries

            for key in keys_to_remove:
                del self._cache[key]
            if DEBUG_MODE:
                print(f"[CACHE] Invalidated all {cache_type.value} entries ({len(keys_to_remove)} total, {dirty_count} were dirty)")

    def clear_all(self) -> None:
        """Clear entire cache - thread-safe with lock"""
        with self._lock:
            self._cache.clear()
            if DEBUG_MODE:
                print("[CACHE] Cleared entire cache")

    def _should_refresh_daily_cache(self) -> bool:
        """Check if daily cache should be refreshed (12:02 AM UTC)"""
        now = datetime.now(timezone.utc)
        today_refresh = now.replace(hour=0, minute=2, second=0, microsecond=0)
        
        # Check if we already refreshed today
        if self._last_daily_refresh:
            last_refresh_date = datetime.fromtimestamp(self._last_daily_refresh, tz=timezone.utc)
            if last_refresh_date.date() == now.date():
                return False
        
        # Check if we have a cached daily problem and if it's from today
        daily_cache = self.get(CacheType.DAILY_PROBLEM)
        if daily_cache and daily_cache.get('date'):
            try:
                cached_date = datetime.fromisoformat(daily_cache['date'].replace('Z', '+00:00'))
                # Only refresh if the cached problem is not from today
                return cached_date.date() < now.date()
            except:
                pass
        
        # If no cache or invalid date, refresh if it's past 12:02 AM UTC today
        return now >= today_refresh
    
    def _refresh_bounties(self):
        """Refresh bounties cache"""
        try:
            if DEBUG_MODE:
                print("[CACHE] Refreshing bounties cache")
            
            # Get all bounties (using a dummy username since get_user_bounties returns all active bounties)
            bounties = BountyOperations.get_user_bounties("dummy")
            self.set(CacheType.BOUNTIES, bounties)
            
        except Exception as e:
            if DEBUG_MODE:
                print(f"[CACHE] Error refreshing bounties: {e}")
    
    def _refresh_bounty_competitions(self):
        """Refresh bounty competitions cache"""
        try:
            if DEBUG_MODE:
                print("[CACHE] Refreshing bounty competitions cache")
            
            # Get all active bounties and their user progress
            bounties = BountyOperations.get_user_bounties("dummy")
            competitions = {}
            
            if bounties.get('success') and bounties.get('data'):
                for bounty in bounties['data']:
                    bounty_id = bounty.get('id')
                    if bounty_id:
                        # For now, just store the bounty data as competition data
                        # In a real implementation, you'd have a separate method to get progress
                        competitions[bounty_id] = {"success": True, "data": bounty}
            
            self.set(CacheType.BOUNTY_COMPETITIONS, competitions)
            
        except Exception as e:
            if DEBUG_MODE:
                print(f"[CACHE] Error refreshing bounty competitions: {e}")
    
    def _refresh_daily_problem(self):
        """Refresh daily problem cache"""
        try:
            if DEBUG_MODE:
                print("[CACHE] Refreshing daily problem cache")
            
            # Get the latest daily problem using get_top_daily_problems and take the first one
            daily_problems = DailyProblemOperations.get_top_daily_problems()
            if daily_problems.get('success') and daily_problems.get('data'):
                latest_problem = daily_problems['data'][0] if daily_problems['data'] else None
                self.set(CacheType.DAILY_PROBLEM, latest_problem)
                # Update last refresh timestamp
                self._last_daily_refresh = time.time()
            else:
                self.set(CacheType.DAILY_PROBLEM, None)
            
        except Exception as e:
            if DEBUG_MODE:
                print(f"[CACHE] Error refreshing daily problem: {e}")
    
    def _refresh_daily_completions(self):
        """Refresh daily completions cache"""
        try:
            if DEBUG_MODE:
                print("[CACHE] Refreshing daily completions cache")
            
            # Get the latest daily problem to see who completed it
            daily_problems = DailyProblemOperations.get_top_daily_problems()
            if daily_problems.get('success') and daily_problems.get('data'):
                latest_problem = daily_problems['data'][0] if daily_problems['data'] else None
                if latest_problem:
                    completions = {
                        "success": True,
                        "data": {
                            "users": latest_problem.get('users', {}),
                            "problem_date": latest_problem.get('date')
                        }
                    }
                    self.set(CacheType.DAILY_COMPLETIONS, completions)
                else:
                    self.set(CacheType.DAILY_COMPLETIONS, {"success": True, "data": {"users": {}}})
            else:
                self.set(CacheType.DAILY_COMPLETIONS, {"success": True, "data": {"users": {}}})
            
        except Exception as e:
            if DEBUG_MODE:
                print(f"[CACHE] Error refreshing daily completions: {e}")
    
    def _refresh_users(self):
        """Refresh users cache"""
        try:
            if DEBUG_MODE:
                print("[CACHE] Refreshing users cache")
            
            # Scan all users from DynamoDB
            if not USERS_TABLE:
                raise Exception("USERS_TABLE not configured")
            
            scan_result = ddb.scan(TableName=USERS_TABLE)
            all_users = scan_result.get('Items', [])
            
            # Normalize user data
            normalized_users = [normalize_dynamodb_item(user) for user in all_users]
            
            users_data = {"success": True, "data": normalized_users}
            self.set(CacheType.USERS, users_data)
            
        except Exception as e:
            if DEBUG_MODE:
                print(f"[CACHE] Error refreshing users: {e}")
    
    def _refresh_duels(self):
        """Refresh duels cache (last 48 hours)"""
        try:
            if DEBUG_MODE:
                print("[CACHE] Refreshing duels cache")
            
            # Scan all duels from DynamoDB
            if not DUELS_TABLE:
                raise Exception("DUELS_TABLE not configured")
            
            scan_result = ddb.scan(TableName=DUELS_TABLE)
            all_duels = scan_result.get('Items', [])
            
            # Filter for recent duels (last 48 hours)
            current_time = int(time.time())
            recent_duels = []
            for duel in all_duels:
                created_time = int(duel.get('created_at', {}).get('N', '0'))
                if current_time - created_time < 48 * 60 * 60:  # 48 hours
                    recent_duels.append(duel)
            
            # Normalize duel data
            normalized_duels = [normalize_dynamodb_item(duel) for duel in recent_duels]
            
            duels_data = {"success": True, "data": normalized_duels}
            self.set(CacheType.DUELS, duels_data)
            
        except Exception as e:
            if DEBUG_MODE:
                print(f"[CACHE] Error refreshing duels: {e}")
    
    def _refresh_groups(self):
        """Refresh groups cache"""
        try:
            if DEBUG_MODE:
                print("[CACHE] Refreshing groups cache")
            
            # Scan all groups from DynamoDB
            if not GROUPS_TABLE:
                raise Exception("GROUPS_TABLE not configured")
            
            scan_result = ddb.scan(TableName=GROUPS_TABLE)
            all_groups = scan_result.get('Items', [])
            
            # Normalize group data
            normalized_groups = [normalize_dynamodb_item(group) for group in all_groups]
            
            groups_data = {"success": True, "data": normalized_groups}
            self.set(CacheType.GROUPS, groups_data)
            
        except Exception as e:
            if DEBUG_MODE:
                print(f"[CACHE] Error refreshing groups: {e}")
    
    def _refresh_worker(self):
        """Background worker that refreshes cache based on schedule"""
        while not self._stop_refresh:
            try:
                current_time = time.time()
                
                # Check each cache type for refresh
                for cache_type, config in self._cache_config.items():
                    key = self._get_cache_key(cache_type)
                    entry = self._cache.get(key)
                    
                    # Check if refresh is needed
                    needs_refresh = False
                    if not entry:
                        needs_refresh = True
                    elif self._is_expired(entry):
                        needs_refresh = True
                    elif cache_type == CacheType.DAILY_PROBLEM and self._should_refresh_daily_cache():
                        needs_refresh = True
                    elif config["refresh_interval"] and current_time - entry.timestamp > config["refresh_interval"]:
                        needs_refresh = True
                    
                    if needs_refresh:
                        if cache_type == CacheType.BOUNTIES:
                            self._refresh_bounties()
                        elif cache_type == CacheType.DAILY_PROBLEM:
                            self._refresh_daily_problem()
                        # Other caches refresh on-demand when expired
                
                # Sleep for 5 minutes before next check
                time.sleep(300)
                
            except Exception as e:
                if DEBUG_MODE:
                    print(f"[CACHE] Error in refresh worker: {e}")
                time.sleep(300)
    
    def _start_refresh_thread(self):
        """Start the background refresh thread"""
        self._refresh_thread = threading.Thread(target=self._refresh_worker, daemon=True)
        self._refresh_thread.start()
        if DEBUG_MODE:
            print("[CACHE] Background refresh thread started")
    
    def stop(self):
        """Stop the cache manager"""
        self._stop_refresh = True
        if self._refresh_thread:
            self._refresh_thread.join()
        if DEBUG_MODE:
            print("[CACHE] Cache manager stopped")
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics for monitoring"""
        with self._lock:
            stats = {
                "total_entries": len(self._cache),
                "cache_types": {},
                "memory_usage": "N/A"  # Could implement actual memory tracking
            }

            for cache_type in CacheType:
                prefix = f"{cache_type.value}:"
                count = len([k for k in self._cache.keys() if k.startswith(prefix)])
                stats["cache_types"][cache_type.value] = count

            return stats

    def set_wal_manager(self, wal_manager):
        """Set WAL manager instance for cache-first writes"""
        self._wal_manager = wal_manager
        info("📝 WAL manager attached to cache manager")

    def write(self, cache_type: CacheType, data: Any, identifier: str = "",
              wal_operation: Optional[Dict] = None) -> bool:
        """
        Cache-first write with WAL logging

        Args:
            cache_type: Type of cache entry
            data: Data to write
            identifier: Cache entry identifier
            wal_operation: WAL operation dict with operation, table, key, data

        Returns:
            True if successful, False otherwise
        """
        with self._lock:
            try:
                # 1. Append to WAL first (critical for crash recovery)
                if self._wal_manager and wal_operation:
                    wal_success = self._wal_manager.append(
                        operation=wal_operation.get('operation', 'UPDATE'),
                        table=wal_operation.get('table', ''),
                        key=wal_operation.get('key', {}),
                        data=wal_operation.get('data', {}),
                        cache_type=cache_type.value
                    )

                    if not wal_success:
                        error(f"Failed to write to WAL for {cache_type.value}:{identifier}")
                        return False

                # 2. Write to cache
                key = self._get_cache_key(cache_type, identifier)
                ttl = self._cache_config[cache_type]["ttl"]
                entry = CacheEntry(
                    data=data,
                    timestamp=time.time(),
                    ttl=ttl,
                    dirty=True,  # Mark as dirty (needs DB sync)
                    last_synced=0.0
                )
                self._cache[key] = entry

                cache_operation("Write", key, ttl=ttl, dirty=True)
                return True

            except Exception as e:
                error(f"Cache write failed: {e}")
                return False

    def _write_to_cache_internal(self, cache_type: str, data: Any, identifier: str = "",
                                  mark_dirty: bool = False) -> None:
        """
        Internal method to write to cache without WAL (used by WAL replay)

        Args:
            cache_type: Cache type as string
            data: Data to write
            identifier: Cache entry identifier
            mark_dirty: Whether to mark as dirty
        """
        with self._lock:
            try:
                # Convert string to CacheType enum
                cache_type_enum = CacheType(cache_type)
                key = self._get_cache_key(cache_type_enum, identifier)
                ttl = self._cache_config[cache_type_enum]["ttl"]
                entry = CacheEntry(
                    data=data,
                    timestamp=time.time(),
                    ttl=ttl,
                    dirty=mark_dirty,
                    last_synced=0.0 if mark_dirty else time.time()
                )
                self._cache[key] = entry
            except Exception as e:
                error(f"Internal cache write failed: {e}")

    def get_dirty_entries(self) -> List[Dict]:
        """
        Get all dirty cache entries for DB dump

        Returns:
            List of dirty entries with metadata
        """
        with self._lock:
            dirty_entries = []

            for key, entry in self._cache.items():
                if entry.dirty:
                    # Parse cache type and identifier from key
                    parts = key.split(':', 1)
                    cache_type = parts[0]
                    identifier = parts[1] if len(parts) > 1 else ""

                    dirty_entries.append({
                        "cache_type": cache_type,
                        "identifier": identifier,
                        "data": entry.data,
                        "timestamp": entry.timestamp,
                        "last_synced": entry.last_synced
                    })

            return dirty_entries

    def mark_synced(self, cache_type: str, identifier: str = "") -> None:
        """
        Mark cache entry as synced after successful DB write

        Args:
            cache_type: Cache type as string
            identifier: Cache entry identifier
        """
        with self._lock:
            try:
                # Convert string to CacheType enum
                cache_type_enum = CacheType(cache_type)
                key = self._get_cache_key(cache_type_enum, identifier)
                entry = self._cache.get(key)

                if entry:
                    entry.dirty = False
                    entry.last_synced = time.time()
            except Exception as e:
                error(f"Failed to mark entry as synced: {e}")


# Global cache manager instance
cache_manager = CacheManager()
