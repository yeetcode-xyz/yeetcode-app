# YeetCode Backend Cache Fix Plan

## Executive Summary
The backend cache system has fundamental architectural issues causing data loss, inconsistent state, and broken functionality. Multiple bandaid fixes have been applied that treat symptoms rather than root causes.

## Root Causes

### 1. **Excessive Cache Invalidation Pattern**
**Problem**: Most endpoints invalidate cache immediately after write operations
**Impact**: Dirty data (uncommitted changes) is deleted before WAL can sync to DynamoDB
**Evidence**:
- All duel endpoints call `cache_manager.invalidate_all(CacheType.DUELS)` after operations
- Daily endpoints invalidate DAILY_PROBLEM and DAILY_COMPLETIONS after completion
- This triggers warnings: "⚠️ Invalidating X dirty cache entries - data may be lost"

**Affected Endpoints**:
- `/create-duel` - Line 74: invalidates DUELS
- `/start-duel` - Line 112: invalidates DUELS
- `/complete-duel` - Line 130: invalidates DUELS
- `/reject-duel` - Line 151: invalidates DUELS
- `/record-duel-submission` - Line 175: invalidates DUELS
- `/complete-daily-problem` - Lines 107-108: invalidates DAILY_PROBLEM, DAILY_COMPLETIONS
- `/submit-bounty-solution` - Lines 124-125: invalidates BOUNTIES, BOUNTY_COMPETITIONS

### 2. **Inconsistent Cache-First Implementation**
**Problem**: Mix of cache-first and invalidate-on-write patterns
**Impact**: Unpredictable behavior, race conditions
**Evidence**:
- `/accept-duel` uses cache-first (PR #27 fix)
- All other duel endpoints still use invalidate-on-write
- Group/user operations use cache-first with comments saying "do NOT invalidate"

### 3. **WAL Sync Timing Issues**
**Problem**: WAL background task runs every 30 seconds, but cache invalidation is immediate
**Impact**: 29-second window where dirty data can be lost
**Evidence**:
- `wal_manager.py` syncs every 30 seconds
- Cache invalidation happens immediately after writes
- No guarantee dirty data reaches DB before invalidation

### 4. **Corrupted USERS Cache Structure**
**Problem**: USERS cache has 23 entries but lookups fail
**Impact**: All user data endpoints return null
**Evidence**:
- Cache stats: `"users": 23`
- `/users/akeen_exe` returns: `{"xp": null, "easy": null, "medium": null, ...}`
- Suggests cache_operations.py wrote malformed data structure

### 5. **Streak Reset on Restart**
**Problem**: Streak resets to 0 after server restart
**Impact**: Users lose streak progress
**Root Cause**:
- USER_DAILY_DATA cache not persisted to DB (no WAL operation)
- Only exists in memory cache with TTL
- On restart, cache is empty, DB has no streak data

### 6. **XP Discrepancy Between Leaderboards**
**Problem**: Group leaderboard shows different XP than university leaderboard
**Impact**: Users see inconsistent stats
**Root Cause**:
- Different leaderboards read from different caches
- Cache invalidation causes cache misses at different times
- Some leaderboards read stale DB data, others read fresh cache

## Proposed Solutions

### Phase 1: Stop the Bleeding (URGENT - Deploy ASAP)

#### Fix 1.1: Remove ALL cache invalidations from write endpoints
**Files to modify**:
- `routes/duels.py` - Remove lines 74, 112, 130, 151, 175
- `routes/daily.py` - Remove lines 107-108
- `routes/bounties.py` - Remove lines 124-125

**Rationale**: Cache-first writes update cache in-place. Invalidation destroys uncommitted changes. Let cache TTL handle expiration.

#### Fix 1.2: Fix USERS cache lookup
**Files to check**:
- `cache_operations.py` - `update_user_in_cache()` function
- Verify users are being added to cache with correct structure
- Ensure writes preserve the list structure: `{"success": True, "data": [...]}`

#### Fix 1.3: Persist USER_DAILY_DATA to database
**Files to modify**:
- `cache_operations.py` - `complete_daily_in_cache()` line 224-228
- Change from `cache_manager.set()` to `cache_manager.write()` with WAL operation
- This ensures streak persists across restarts

### Phase 2: Architectural Fixes (Deploy within 24 hours)

#### Fix 2.1: Implement immediate WAL sync for critical operations
**Files to modify**:
- `cache_manager.py` - Add `write_immediate()` function
- Calls `write()` then immediately triggers WAL sync for that entry
- Use for: daily completion, duel completion, XP awards

#### Fix 2.2: Add cache warming on startup
**Files to modify**:
- `main.py` - On startup, load USERS table into cache
- Prevents cache misses on first requests after restart
- Ensures consistent data immediately

#### Fix 2.3: Make cache invalidation safer
**Files to modify**:
- `cache_manager.py` - `invalidate()` and `invalidate_all()`
- Dump dirty entries to DB BEFORE deleting them
- Return error if dump fails (don't invalidate)
- Add `force=True` parameter for admin operations only

### Phase 3: Long-term Improvements (Deploy within 1 week)

#### Fix 3.1: Unified leaderboard data source
**Problem**: Multiple leaderboards read from different places
**Solution**: Create single `/leaderboard/{type}` endpoint that:
- Always reads from same cache
- Falls back to DB if cache miss
- Ensures consistency across all leaderboard views

#### Fix 3.2: Add cache health monitoring
**Files to create**:
- `cache_health.py` - Monitor dirty entry count, age
- Alert if dirty entries > threshold
- Alert if WAL sync is lagging
- Expose via `/admin/cache/health` endpoint

#### Fix 3.3: Reduce WAL sync interval
**Files to modify**:
- `wal_manager.py` - Reduce from 30s to 5s
- Or implement adaptive sync (sync more frequently when dirty count is high)

## Implementation Priority

### CRITICAL (Deploy Today):
1. Remove cache invalidations from duel endpoints (Fix 1.1)
2. Fix USERS cache lookup bug (Fix 1.2)
3. Persist USER_DAILY_DATA to DB (Fix 1.3)

### HIGH (Deploy Tomorrow):
1. Immediate WAL sync for critical ops (Fix 2.1)
2. Cache warming on startup (Fix 2.2)

### MEDIUM (Deploy This Week):
1. Safer cache invalidation (Fix 2.3)
2. Unified leaderboard endpoint (Fix 3.1)
3. Reduce WAL sync interval (Fix 3.3)

### LOW (Deploy When Possible):
1. Cache health monitoring (Fix 3.2)

## Testing Plan

### After Phase 1 Deploy:
1. Complete a daily problem → verify streak increments → restart server → verify streak persists
2. Create a duel → accept duel → verify both users see updated duel status
3. Check all leaderboards → verify XP matches across all views
4. Complete 5 duels rapidly → verify all completions recorded correctly
5. Monitor logs for "⚠️ Invalidating dirty" warnings → should see ZERO

### After Phase 2 Deploy:
1. Restart server → verify all data immediately available (cache warming working)
2. Complete daily → verify XP updates within 1 second (immediate WAL)
3. Monitor cache stats → verify no dirty entries linger > 5 seconds

## Rollback Plan

If Phase 1 causes issues:
1. Revert to commit before cache invalidation removal
2. Manually dump all dirty cache to DB: `POST /cache/dump`
3. Clear cache: `POST /cache/clear`
4. Monitor for data loss, restore from DB backups if needed

## Success Criteria

- ✅ Streaks persist across server restarts
- ✅ Duels can be created, accepted, completed without errors
- ✅ XP is consistent across all leaderboards
- ✅ Zero "⚠️ Invalidating dirty" warnings in logs
- ✅ Cache hit rate > 90% for USERS, DUELS, DAILY_PROBLEM
- ✅ WAL dirty entry count stays < 5 at all times

---

**Created**: 2025-11-18
**Status**: DRAFT - Awaiting approval
**Severity**: CRITICAL - Production data loss occurring

## ADDENDUM: WAL Dump Critical Bug (Discovered 2025-11-20)

### Problem
The `cache_dumper.py` is trying to write **entire cache entries** to DynamoDB, but cache entries have wrapped structures that don't match DB schemas:

```python
# What's in cache (wrapped):
{"success": True, "data": [user1, user2, user3]}

# What cache_dumper tries to write:
convert_to_dynamodb_format({"success": True, "data": [...]})
# Results in invalid DynamoDB item!
```

### Errors Observed:
1. **Daily table**: `"cannot be converted to a numeric value: True"` 
   - Cache has `users: {username: True}` (boolean)
   - DynamoDB might expect numeric values

2. **USERS table**: `"provided key element does not match the schema"`
   - Cache has wrapped structure `{"success": ..., "data": [...]}`
   - DynamoDB expects individual user objects with `username` key

### Root Cause:
The WAL system has TWO write mechanisms:
1. **WAL operations** (from `cache_operations.py`) - Correctly structured, partial updates ✅
2. **Cache dumps** (from `cache_dumper.py`) - Dumps raw cache, wrong structure ❌

The cache dump should use the WAL operation log, NOT dump raw cache entries.

### Impact:
- Cache dumps fail silently
- Dirty data doesn't reach database
- On server crash/restart, data lost

### Why Phase 1 Helps:
By removing cache invalidations, we:
- Reduce frequency of cache dumps (only triggered on explicit /cache/clear)
- Reduce dirty entry count (entries sync via normal WAL)
- Buy time to fix the dump logic properly

### Phase 2 Fix Required:
1. ✅ **COMPLETED** - Rewrite `cache_dumper.py` to use WAL operation log instead of raw cache
2. ✅ **COMPLETED** - Add validation before processing (checks for complete WAL entries)
3. ✅ **COMPLETED** - Add error tracking and graceful failure handling
4. ⏳ **PENDING** - Test thoroughly with all cache types

**Priority**: HIGH (after Phase 1 deploys)
**Complexity**: MEDIUM-HIGH
**Risk**: HIGH if not done carefully

### What Was Fixed:

**Initial Fix (Commit 1):**
The `dump_cache_to_db()` function in `cache_dumper.py` now:
- Reads from WAL operation log (`wal_manager.get_entries_since()`) instead of raw cache entries
- Processes each WAL operation type correctly: UPDATE, PUT, DELETE, INCREMENT
- Converts data to proper DynamoDB format based on operation type
- Uses `update_item()` for UPDATEs (partial updates) instead of `put_item()` (full overwrites)
- Tracks errors per operation instead of failing entire batch
- Only clears WAL and marks entries synced if ALL operations succeed

**Critical Follow-up Fixes (Commit 2):**

1. **DELETE Validation Bug**:
   - Problem: Validation used `if not all([operation, table, key, data])` which rejected DELETEs (no data field)
   - Impact: DELETE operations silently skipped, WAL cleared anyway, deletes lost permanently
   - Fix: Per-operation validation (DELETE only needs operation/table/key)
   - Fix: Increment `total_failed` for invalid entries to prevent silent WAL clearing

2. **INCREMENT Replay Bug**:
   - Problem: Non-idempotent INCREMENT operations replayed from sequence 0 on every retry
   - Impact: Users got 2x-3x XP/streak increments after partial sync failures
   - Fix: Added checkpoint file tracking `last_applied_sequence`
   - Fix: Resume from checkpoint + 1, update checkpoint after each successful write
   - Implementation: Atomic checkpoint writes (temp file + `os.replace`) for crash safety

**New WAL Manager Features:**
- `get_last_applied_sequence()` - Returns checkpoint value
- `set_last_applied_sequence(seq)` - Atomically updates checkpoint
- Checkpoint file: `/tmp/yeetcode/wal.checkpoint`
- Survives crashes and restarts

**Additional Type Conversion Fix (Commit 3):**

3. **List Type Corruption Bug**:
   - Problem: List conversion used `[{'S': str(item)} for item in value]` which coerced all items to strings
   - Impact:
     - Numeric lists corrupted: `[1, 2, 3]` → `[{'S': '1'}, {'S': '2'}, {'S': '3'}]`
     - Boolean lists corrupted: `[true, false]` → `[{'S': 'True'}, {'S': 'False'}]`
     - Nested structures lost entirely
     - Bool checked after int (bool is subclass of int in Python), causing bools treated as ints
   - Fix: Created `convert_value_to_dynamodb(value)` recursive helper
     - Checks bool BEFORE int (critical for correct type detection)
     - Recursively handles nested lists and dicts with proper type preservation
     - Reused by both `convert_to_dynamodb_format()` and UPDATE operations
   - Impact: Proper type preservation for all DynamoDB updates

