"""
Cache Dumper for YeetCode FastAPI

Periodically dumps dirty cache entries to DynamoDB in batches.
Runs every 10 minutes to persist cache state to database.
"""

import os
import boto3
from typing import Dict, List
from logger import info, error, warning
from cache_manager import cache_manager, CacheType
from wal_manager import wal_manager

# DynamoDB client
ddb = boto3.client('dynamodb', region_name=os.environ.get('AWS_REGION', 'us-east-1'))

# Table names from environment
USERS_TABLE = os.environ.get('USERS_TABLE', 'Yeetcode_users')
DAILY_TABLE = os.environ.get('DAILY_TABLE', 'Daily')
DUELS_TABLE = os.environ.get('DUELS_TABLE', 'Duels')
BOUNTIES_TABLE = os.environ.get('BOUNTIES_TABLE', 'Bounties')


def chunks(lst: List, n: int):
    """Yield successive n-sized chunks from lst"""
    for i in range(0, len(lst), n):
        yield lst[i:i + n]


def convert_to_dynamodb_format(data: Dict) -> Dict:
    """
    Convert Python dict to DynamoDB format

    Args:
        data: Python dictionary

    Returns:
        DynamoDB formatted dictionary
    """
    dynamodb_item = {}

    for key, value in data.items():
        if isinstance(value, str):
            dynamodb_item[key] = {'S': value}
        elif isinstance(value, int):
            dynamodb_item[key] = {'N': str(value)}
        elif isinstance(value, float):
            dynamodb_item[key] = {'N': str(value)}
        elif isinstance(value, bool):
            dynamodb_item[key] = {'BOOL': value}
        elif isinstance(value, dict):
            dynamodb_item[key] = {'M': convert_to_dynamodb_format(value)}
        elif isinstance(value, list):
            # Convert list to DynamoDB List
            dynamodb_list = []
            for item in value:
                if isinstance(item, str):
                    dynamodb_list.append({'S': item})
                elif isinstance(item, (int, float)):
                    dynamodb_list.append({'N': str(item)})
                elif isinstance(item, dict):
                    dynamodb_list.append({'M': convert_to_dynamodb_format(item)})
            dynamodb_item[key] = {'L': dynamodb_list}
        elif value is None:
            dynamodb_item[key] = {'NULL': True}

    return dynamodb_item


def batch_write_to_dynamodb(table_name: str, items: List[Dict]) -> Dict:
    """
    Write items to DynamoDB in batches of 25

    Args:
        table_name: DynamoDB table name
        items: List of items to write (in DynamoDB format)

    Returns:
        Dictionary with success status and stats
    """
    total_written = 0
    total_failed = 0
    failed_items = []

    try:
        for batch in chunks(items, 25):  # DynamoDB limit: 25 items per batch
            request_items = {
                table_name: [
                    {'PutRequest': {'Item': item}} for item in batch
                ]
            }

            response = ddb.batch_write_item(RequestItems=request_items)

            # Handle unprocessed items
            unprocessed = response.get('UnprocessedItems', {})
            if unprocessed:
                # Retry unprocessed items once
                retry_response = ddb.batch_write_item(RequestItems=unprocessed)
                unprocessed = retry_response.get('UnprocessedItems', {})

                if unprocessed:
                    failed_count = len(unprocessed.get(table_name, []))
                    total_failed += failed_count
                    failed_items.extend(unprocessed.get(table_name, []))
                    warning(f"Failed to write {failed_count} items to {table_name} after retry")

            total_written += len(batch) - len(unprocessed.get(table_name, []))

        return {
            "success": total_failed == 0,
            "written": total_written,
            "failed": total_failed,
            "failed_items": failed_items
        }

    except Exception as e:
        error(f"Batch write to {table_name} failed: {e}")
        return {
            "success": False,
            "written": total_written,
            "failed": len(items) - total_written,
            "error": str(e)
        }


async def dump_cache_to_db() -> Dict:
    """
    Dump all dirty cache entries to DynamoDB

    Returns:
        Dictionary with dump statistics
    """
    info("🗄️ Starting cache dump to DynamoDB...")

    try:
        # Get all dirty entries from cache
        dirty_entries = cache_manager.get_dirty_entries()

        if not dirty_entries:
            info("✅ No dirty entries to dump")
            return {"success": True, "entries": 0, "message": "No dirty entries"}

        info(f"📦 Found {len(dirty_entries)} dirty entries to dump")

        # Group entries by table
        users_items = []
        daily_items = []
        duels_items = []
        bounties_items = []

        for entry in dirty_entries:
            cache_type = entry.get('cache_type')
            data = entry.get('data')

            if not data:
                continue

            # Convert to DynamoDB format
            dynamodb_item = convert_to_dynamodb_format(data)

            # CRITICAL FIX: Convert string cache_type to CacheType enum for comparison
            # cache_type is a string (e.g., "users") from cache key, not a CacheType enum
            try:
                cache_type_enum = CacheType(cache_type)
            except ValueError:
                error(f"Unknown cache type: {cache_type}, skipping entry")
                continue

            # Route to appropriate table
            if cache_type_enum == CacheType.USERS:
                users_items.append(dynamodb_item)
            elif cache_type_enum == CacheType.DAILY_PROBLEM or cache_type_enum == CacheType.DAILY_COMPLETIONS:
                daily_items.append(dynamodb_item)
            elif cache_type_enum == CacheType.DUELS:
                duels_items.append(dynamodb_item)
            elif cache_type_enum == CacheType.BOUNTIES or cache_type_enum == CacheType.BOUNTY_COMPETITIONS:
                bounties_items.append(dynamodb_item)

        # Batch write to each table
        results = {}

        if users_items:
            info(f"💾 Writing {len(users_items)} users to DynamoDB...")
            results['users'] = batch_write_to_dynamodb(USERS_TABLE, users_items)

        if daily_items:
            info(f"💾 Writing {len(daily_items)} daily items to DynamoDB...")
            results['daily'] = batch_write_to_dynamodb(DAILY_TABLE, daily_items)

        if duels_items:
            info(f"💾 Writing {len(duels_items)} duels to DynamoDB...")
            results['duels'] = batch_write_to_dynamodb(DUELS_TABLE, duels_items)

        if bounties_items:
            info(f"💾 Writing {len(bounties_items)} bounties to DynamoDB...")
            results['bounties'] = batch_write_to_dynamodb(BOUNTIES_TABLE, bounties_items)

        # Check overall success
        all_successful = all(r.get('success', False) for r in results.values())

        if all_successful:
            # Mark all entries as synced
            for entry in dirty_entries:
                cache_manager.mark_synced(entry['cache_type'], entry.get('identifier', ''))

            # Clear WAL file
            wal_manager.clear()

            total_written = sum(r.get('written', 0) for r in results.values())
            info(f"✅ Cache dump complete: {total_written} entries written to DynamoDB")

            return {
                "success": True,
                "entries": total_written,
                "results": results
            }
        else:
            total_failed = sum(r.get('failed', 0) for r in results.values())
            error(f"⚠️ Cache dump partially failed: {total_failed} entries failed")

            return {
                "success": False,
                "entries": len(dirty_entries),
                "failed": total_failed,
                "results": results
            }

    except Exception as e:
        error(f"❌ Cache dump failed: {e}")
        return {
            "success": False,
            "error": str(e)
        }

