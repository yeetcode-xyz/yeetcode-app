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


def convert_value_to_dynamodb(value):
    """
    Convert a single Python value to DynamoDB format (recursive helper)

    Args:
        value: Python value of any type

    Returns:
        DynamoDB formatted value with type key
    """
    if isinstance(value, bool):
        # IMPORTANT: Check bool before int (bool is subclass of int in Python)
        return {'BOOL': value}
    elif isinstance(value, str):
        return {'S': value}
    elif isinstance(value, int):
        return {'N': str(value)}
    elif isinstance(value, float):
        return {'N': str(value)}
    elif isinstance(value, dict):
        return {'M': convert_to_dynamodb_format(value)}
    elif isinstance(value, list):
        # Recursively convert each item in the list
        dynamodb_list = []
        for item in value:
            dynamodb_list.append(convert_value_to_dynamodb(item))
        return {'L': dynamodb_list}
    elif value is None:
        return {'NULL': True}
    else:
        # Fallback: convert to string
        return {'S': str(value)}


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
        dynamodb_item[key] = convert_value_to_dynamodb(value)

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
    Dump all dirty cache entries to DynamoDB by replaying WAL operations.

    CRITICAL FIX: Instead of dumping raw cache entries (which have wrapped structures
    like {"success": True, "data": [...]}), we now read from the WAL operation log
    which has correctly structured operations for DynamoDB updates.

    Returns:
        Dictionary with dump statistics
    """
    info("🗄️ Starting cache dump to DynamoDB via WAL operations...")

    try:
        # Get checkpoint to avoid replaying already-applied entries
        last_applied = wal_manager.get_last_applied_sequence()
        info(f"📍 Checkpoint: last_applied_sequence = {last_applied}")

        # Get WAL entries since last checkpoint (+ 1 to get next unapplied entry)
        wal_entries = wal_manager.get_entries_since(last_applied + 1)

        if not wal_entries:
            info("✅ No new WAL entries to sync")
            return {"success": True, "entries": 0, "message": "No new WAL entries"}

        info(f"📦 Found {len(wal_entries)} new WAL entries to sync to DynamoDB")

        # Track stats
        total_synced = 0
        total_failed = 0
        errors = []

        # Process each WAL operation
        for entry in wal_entries:
            operation = entry.get('operation')
            table = entry.get('table')
            key = entry.get('key')
            data = entry.get('data')

            # Validate based on operation type
            # DELETE operations don't require data, all others do
            if operation == "DELETE":
                if not all([operation, table, key]):
                    total_failed += 1
                    error_msg = f"Skipping incomplete DELETE entry (missing operation/table/key): {entry}"
                    warning(error_msg)
                    errors.append(error_msg)
                    continue
            else:
                if not all([operation, table, key, data]):
                    total_failed += 1
                    error_msg = f"Skipping incomplete {operation} entry (missing required fields): {entry}"
                    warning(error_msg)
                    errors.append(error_msg)
                    continue

            try:
                if operation == "UPDATE":
                    # Build UpdateExpression from data
                    update_expr_parts = []
                    expr_attr_values = {}

                    for field, value in data.items():
                        update_expr_parts.append(f"{field} = :{field}")
                        # Convert to DynamoDB format using helper to preserve types
                        expr_attr_values[f":{field}"] = convert_value_to_dynamodb(value)

                    # Convert key to DynamoDB format
                    dynamodb_key = {}
                    for k, v in key.items():
                        if isinstance(v, str):
                            dynamodb_key[k] = {'S': v}
                        elif isinstance(v, (int, float)):
                            dynamodb_key[k] = {'N': str(v)}

                    # Perform update
                    ddb.update_item(
                        TableName=table,
                        Key=dynamodb_key,
                        UpdateExpression=f"SET {', '.join(update_expr_parts)}",
                        ExpressionAttributeValues=expr_attr_values
                    )

                elif operation == "PUT":
                    # Full item put - merge key and data
                    item = {**key, **data}
                    dynamodb_item = convert_to_dynamodb_format(item)

                    ddb.put_item(
                        TableName=table,
                        Item=dynamodb_item
                    )

                elif operation == "DELETE":
                    # Convert key to DynamoDB format
                    dynamodb_key = {}
                    for k, v in key.items():
                        if isinstance(v, str):
                            dynamodb_key[k] = {'S': v}
                        elif isinstance(v, (int, float)):
                            dynamodb_key[k] = {'N': str(v)}

                    ddb.delete_item(
                        TableName=table,
                        Key=dynamodb_key
                    )

                elif operation == "INCREMENT":
                    # Build increment expression
                    update_expr_parts = []
                    expr_attr_values = {}

                    for field, value in data.items():
                        update_expr_parts.append(f"{field} = if_not_exists({field}, :zero) + :{field}")
                        expr_attr_values[f":{field}"] = {'N': str(value)}

                    expr_attr_values[":zero"] = {'N': '0'}

                    # Convert key to DynamoDB format
                    dynamodb_key = {}
                    for k, v in key.items():
                        if isinstance(v, str):
                            dynamodb_key[k] = {'S': v}
                        elif isinstance(v, (int, float)):
                            dynamodb_key[k] = {'N': str(v)}

                    ddb.update_item(
                        TableName=table,
                        Key=dynamodb_key,
                        UpdateExpression=f"SET {', '.join(update_expr_parts)}",
                        ExpressionAttributeValues=expr_attr_values
                    )

                total_synced += 1

                # Update checkpoint after successful operation to avoid replay
                entry_sequence = entry.get('sequence', -1)
                if entry_sequence >= 0:
                    wal_manager.set_last_applied_sequence(entry_sequence)

            except Exception as e:
                total_failed += 1
                error_msg = f"Failed to sync WAL entry to {table}: {e}"
                error(error_msg)
                errors.append(error_msg)
                # Don't update checkpoint on failure - will retry this entry next time
                continue

        # Mark success if all synced
        if total_failed == 0:
            # Mark all cache entries as synced
            dirty_entries = cache_manager.get_dirty_entries()
            for entry in dirty_entries:
                cache_manager.mark_synced(entry['cache_type'], entry.get('identifier', ''))

            # Clear WAL file after successful sync
            wal_manager.clear()

            info(f"✅ Cache dump complete: {total_synced} WAL operations synced to DynamoDB")

            return {
                "success": True,
                "entries": total_synced,
                "failed": 0
            }
        else:
            warning(f"⚠️ Cache dump partially failed: {total_failed}/{len(wal_entries)} operations failed")

            return {
                "success": False,
                "entries": len(wal_entries),
                "synced": total_synced,
                "failed": total_failed,
                "errors": errors
            }

    except Exception as e:
        error(f"❌ Cache dump failed: {e}")
        return {
            "success": False,
            "error": str(e)
        }

