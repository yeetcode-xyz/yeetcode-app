import asyncio
import json
import os
from datetime import datetime, timezone
import aiohttp
from aiobotocore.session import get_session
import logging

logging.basicConfig(level=logging.INFO)

async def fetch_stats(session, username):
    url = "https://leetcode.com/graphql"
    query = """
      query getUserStats($username: String!) {
        matchedUser(username: $username) {
          submitStats: submitStatsGlobal {
            acSubmissionNum { difficulty count }
          }
        }
      }
    """
    payload = {"query": query, "variables": {"username": username}}

    async with session.post(url, json=payload) as response:
        data = await response.json()

    easy = medium = hard = 0
    for item in data.get("data", {}).get("matchedUser", {}).get("submitStats", {}).get("acSubmissionNum", []):
        if item["difficulty"] == "Easy":
            easy = item["count"]
        elif item["difficulty"] == "Medium":
            medium = item["count"]
        elif item["difficulty"] == "Hard":
            hard = item["count"]

    return {"easy": easy, "medium": medium, "hard": hard}

async def solved_today(session, username, limit):
    url = "https://leetcode.com/graphql"
    query = """
      query recentSubmissions($username: String!, $limit: Int!) {
        recentSubmissionList(username: $username, limit: $limit) {
          timestamp
          status
        }
      }
    """
    payload = {"query": query, "variables": {"username": username, "limit": limit}}

    async with session.post(url, json=payload) as response:
        data = await response.json()

    midnight = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0).astimezone(timezone.utc).timestamp()

    return sum(
        1 for entry in data.get("data", {}).get("recentSubmissionList", [])
        if entry["status"] == "AC" and int(entry["timestamp"]) >= midnight
    )

async def process_user(session, db, table, username):
    try:
        stats = await fetch_stats(session, username)
        today = await solved_today(session, username, 200)
        await db.update_item(
            TableName=table,
            Key={"username": {"S": username}},
            UpdateExpression="SET easy = :e, medium = :m, hard = :h, today = :t",
            ExpressionAttributeValues={
                ":e": {"N": str(stats["easy"])},
                ":m": {"N": str(stats["medium"])},
                ":h": {"N": str(stats["hard"])},
                ":t": {"N": str(today)},
            },
        )
        return 1
    except Exception as e:
        logging.error(f"Error updating {username}: {e}")
        return 0

async def lambda_handler_async(event, context=None):
    table = os.environ.get("TABLE_NAME", "Yeetcode_users")
    session = get_session()

    async with session.create_client("dynamodb", region_name="us-east-1") as db, aiohttp.ClientSession() as http:
        response = await db.scan(
            TableName=table,
            ProjectionExpression="username",
        )
        items = response.get("Items", [])
        usernames = [item["username"]["S"] for item in items]

        tasks = [process_user(http, db, table, user) for user in usernames]
        updated_count = sum(await asyncio.gather(*tasks))

        return {
            "statusCode": 200,
            "body": json.dumps({"updated": updated_count})
        }

# AWS Lambda entrypoint — sync wrapper
def lambda_handler(event, context):
    return asyncio.run(lambda_handler_async(event, context))
