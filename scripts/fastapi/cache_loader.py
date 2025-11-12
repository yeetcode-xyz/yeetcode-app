"""
Cache Loader for YeetCode FastAPI

Loads all data from DynamoDB into cache on startup.
Ensures cache is populated before server accepts requests.
"""

import os
import boto3
from typing import Dict, List
from logger import info, error
from cache_manager import cache_manager, CacheType
from aws import normalize_dynamodb_item

# DynamoDB client
ddb = boto3.client('dynamodb', region_name=os.environ.get('AWS_REGION', 'us-east-1'))

# Table names from environment
USERS_TABLE = os.environ.get('USERS_TABLE', 'Yeetcode_users')
DAILY_TABLE = os.environ.get('DAILY_TABLE', 'Daily')
DUELS_TABLE = os.environ.get('DUELS_TABLE', 'Duels')
BOUNTIES_TABLE = os.environ.get('BOUNTIES_TABLE', 'Bounties')


def scan_table(table_name: str) -> List[Dict]:
    """
    Scan entire DynamoDB table and return all items

    Args:
        table_name: DynamoDB table name

    Returns:
        List of normalized items
    """
    try:
        items = []
        scan_params = {'TableName': table_name}

        # Paginated scan
        while True:
            response = ddb.scan(**scan_params)
            batch = response.get('Items', [])

            # Normalize each item
            normalized_batch = [normalize_dynamodb_item(item) for item in batch]
            items.extend(normalized_batch)

            # Check for more pages
            if 'LastEvaluatedKey' not in response:
                break

            scan_params['ExclusiveStartKey'] = response['LastEvaluatedKey']

        return items

    except Exception as e:
        error(f"Failed to scan table {table_name}: {e}")
        return []


async def load_all_data_into_cache() -> Dict:
    """
    Load all data from DynamoDB tables into cache on startup

    Returns:
        Dictionary with load statistics
    """
    info("🚀 Loading all data from DynamoDB into cache...")

    try:
        stats = {
            "users": 0,
            "daily": 0,
            "duels": 0,
            "bounties": 0
        }

        # Load users
        info(f"📖 Loading users from {USERS_TABLE}...")
        users = scan_table(USERS_TABLE)
        if users:
            # Store all users in cache as a single entry
            cache_manager.set(
                cache_type=CacheType.USERS,
                data={"success": True, "data": users},
                ttl=300  # 5 minutes TTL
            )
            stats['users'] = len(users)
            info(f"✅ Loaded {len(users)} users into cache")

        # Load daily problems
        info(f"📖 Loading daily problems from {DAILY_TABLE}...")
        daily_problems = scan_table(DAILY_TABLE)
        if daily_problems:
            # Find today's problem
            from datetime import datetime
            today = datetime.utcnow().strftime("%Y-%m-%d")
            todays_problem = next((p for p in daily_problems if p.get('date') == today), None)

            if todays_problem:
                cache_manager.set(
                    cache_type=CacheType.DAILY_PROBLEM,
                    data={"success": True, "data": todays_problem},
                    ttl=86400  # 24 hours
                )

            stats['daily'] = len(daily_problems)
            info(f"✅ Loaded {len(daily_problems)} daily problems into cache")

        # Load duels
        info(f"📖 Loading duels from {DUELS_TABLE}...")
        duels = scan_table(DUELS_TABLE)
        if duels:
            # Group duels by status for efficient querying
            active_duels = [d for d in duels if d.get('status') in ['PENDING', 'ACCEPTED', 'ACTIVE']]

            cache_manager.set(
                cache_type=CacheType.DUELS,
                data={"success": True, "data": duels},
                ttl=60  # 1 minute TTL
            )

            stats['duels'] = len(duels)
            info(f"✅ Loaded {len(duels)} duels into cache ({len(active_duels)} active)")

        # Load bounties
        info(f"📖 Loading bounties from {BOUNTIES_TABLE}...")
        bounties = scan_table(BOUNTIES_TABLE)
        if bounties:
            cache_manager.set(
                cache_type=CacheType.BOUNTIES,
                data={"success": True, "data": bounties},
                ttl=86400  # 24 hours
            )

            stats['bounties'] = len(bounties)
            info(f"✅ Loaded {len(bounties)} bounties into cache")

        total_items = sum(stats.values())
        info(f"🎉 Cache loading complete: {total_items} total items loaded")

        return {
            "success": True,
            "stats": stats,
            "total": total_items
        }

    except Exception as e:
        error(f"❌ Failed to load data into cache: {e}")
        return {
            "success": False,
            "error": str(e)
        }

