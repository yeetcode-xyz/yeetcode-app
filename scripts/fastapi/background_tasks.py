"""
Background tasks for YeetCode FastAPI server
Replaces AWS Lambda functions with integrated FastAPI background jobs
"""

import asyncio
import logging
import random
import requests
from datetime import datetime
from typing import Dict, List, Optional
import os

from aws import UserOperations, DailyProblemOperations, BountyOperations, ddb
from cache_manager import cache_manager, CacheType
from cache_operations import update_user_in_cache, update_bounty_in_cache

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

# Discord webhook for notifications
# Separate webhook for lambda/background task logs (different from account creation webhook)
DISCORD_LAMBDA_LOGS_WEBHOOK = os.environ.get("DISCORD_LAMBDA_LOGS_WEBHOOK")


def discord_log(message: str):
    """Send log message to Discord webhook"""
    if not DISCORD_LAMBDA_LOGS_WEBHOOK:
        return
    try:
        requests.post(DISCORD_LAMBDA_LOGS_WEBHOOK, json={"content": message}, timeout=5)
    except Exception as e:
        log.error(f"❌ Failed to send Discord log: {e}")


# ========================================
# TASK 1: Update User Stats
# ========================================

def fetch_user_stats(username: str) -> Dict:
    """Fetch user stats from LeetCode GraphQL API"""
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

    try:
        response = requests.post(url, json=payload, timeout=10)
        response.raise_for_status()
        data = response.json()
    except Exception as e:
        log.error(f"Error fetching stats for {username}: {e}")
        return {"easy": 0, "medium": 0, "hard": 0}

    easy = medium = hard = 0
    submissions = data.get("data", {}).get("matchedUser", {}).get("submitStats", {}).get("acSubmissionNum", [])

    for item in submissions:
        difficulty = item.get("difficulty", "")
        count = item.get("count", 0)
        if difficulty == "Easy":
            easy = count
        elif difficulty == "Medium":
            medium = count
        elif difficulty == "Hard":
            hard = count

    return {"easy": easy, "medium": medium, "hard": hard}


def check_daily_completion(username: str) -> Optional[str]:
    """Check if user completed today's daily problem"""
    try:
        # Get today's problem slug from database
        today = datetime.utcnow().strftime("%Y-%m-%d")

        try:
            daily_item = ddb.get_item(
                TableName=os.environ.get("DAILY_TABLE", "Daily"),
                Key={"date": {"S": today}}
            )

            if "Item" not in daily_item:
                return None

            slug = daily_item["Item"].get("slug", {}).get("S")
            if not slug:
                return None
        except Exception as e:
            log.error(f"Error fetching daily problem: {e}")
            return None

        # Get recent submissions
        query = """
          query recentSubmissions($username: String!, $limit: Int!) {
            recentSubmissionList(username: $username, limit: $limit) {
              status
              titleSlug
            }
          }
        """
        payload = {"query": query, "variables": {"username": username, "limit": 100}}

        response = requests.post("https://leetcode.com/graphql", json=payload, timeout=10)
        response.raise_for_status()
        data = response.json()

        submissions = data.get("data", {}).get("recentSubmissionList", [])

        # Status 10 = Accepted
        if any(sub.get("status") == 10 and sub.get("titleSlug") == slug for sub in submissions):
            return slug

        return None
    except Exception as e:
        log.error(f"Error checking daily completion for {username}: {e}")
        return None


async def process_single_user(username: str) -> bool:
    """Process a single user: update stats and check daily completion"""
    try:
        # Run in thread pool to avoid blocking
        stats = await asyncio.to_thread(fetch_user_stats, username)

        # Skip if stats fetch failed
        if not stats:
            log.warning(f"⚠️ Failed to fetch stats for {username}")
            return False

        # Get existing values from DB
        user_data = UserOperations.get_user_data(username)
        if not user_data:
            log.warning(f"⚠️ User {username} not found in database")
            return False

        current_easy = user_data.get("easy", 0)
        current_medium = user_data.get("medium", 0)
        current_hard = user_data.get("hard", 0)
        current_xp = user_data.get("xp", 0)  # Preserve existing bonus XP

        # Only update if changed
        if (stats["easy"] != current_easy or
            stats["medium"] != current_medium or
            stats["hard"] != current_hard):

            # CACHE-FIRST: Write to cache instead of DB
            # Include XP to preserve bonus XP from daily challenges, duels, etc.
            success = update_user_in_cache(username.lower(), {
                "easy": stats["easy"],
                "medium": stats["medium"],
                "hard": stats["hard"],
                "xp": current_xp  # Preserve existing XP
            })

            if success:
                log.info(f"✅ Updated stats for {username}: {stats}")
            else:
                log.error(f"❌ Failed to update stats in cache for {username}")

        # Check daily completion
        completed_slug = await asyncio.to_thread(check_daily_completion, username)
        if completed_slug:
            log.info(f"🎯 {username} completed daily problem: {completed_slug}")
            # Note: Daily completion XP is awarded via the existing complete-daily-problem endpoint
            # which is called by the Electron app when it detects completion

        return True
    except Exception as e:
        log.error(f"❌ Error processing user {username}: {e}")
        return False


async def update_user_stats():
    """
    Background task: Update all users' LeetCode stats
    Runs every 3 minutes
    """
    log.info("🚀 Starting user stats update task...")

    try:
        # Get all users by scanning the users table
        response = ddb.scan(TableName=os.environ.get("TABLE_NAME", "Yeetcode_users"))

        if "Items" not in response:
            log.error("Failed to fetch users")
            return

        # Extract usernames from DynamoDB items (exclude verification_ entries)
        from aws import normalize_dynamodb_item
        users = [normalize_dynamodb_item(item) for item in response["Items"]]
        usernames = [
            u.get("username") for u in users
            if u.get("username") and not u.get("username").startswith("verification_")
        ]
        log.info(f"📊 Processing {len(usernames)} users...")

        # Process users with concurrency limit
        semaphore = asyncio.Semaphore(30)

        async def process_with_limit(username):
            async with semaphore:
                return await process_single_user(username)

        results = await asyncio.gather(
            *[process_with_limit(u) for u in usernames],
            return_exceptions=True
        )

        success_count = sum(1 for r in results if r is True)
        log.info(f"✅ Stats update complete: {success_count}/{len(usernames)} users processed")

    except Exception as e:
        log.error(f"❌ Error in update_user_stats: {e}")


# ========================================
# TASK 2: Update Bounty Progress
# ========================================

def get_user_metric_value(user_data: Dict, metric: str) -> int:
    """Get the value for a specific metric from user data"""
    if metric == "easy":
        return user_data.get("easy", 0)
    elif metric == "medium":
        return user_data.get("medium", 0)
    elif metric == "hard":
        return user_data.get("hard", 0)
    else:  # "total"
        return (
            user_data.get("easy", 0) +
            user_data.get("medium", 0) +
            user_data.get("hard", 0)
        )


async def update_bounty_progress():
    """
    Background task: Check all users' bounty progress and update completion status
    Runs every 5 minutes
    Note: Does not award XP - that's handled by the existing bounty completion endpoint
    """
    log.info("🎯 Starting bounty progress update task...")

    try:
        # Get all bounties
        bounties_result = BountyOperations.get_all_bounties()
        if not bounties_result.get("success"):
            log.error("Failed to fetch bounties")
            return

        bounties = bounties_result.get("data", [])
        log.info(f"📦 Loaded {len(bounties)} bounties")

        # Debug: Log first bounty structure if available
        if bounties:
            log.info(f"🔍 Sample bounty keys: {list(bounties[0].keys())}")

        # Get all users by scanning the users table
        response = ddb.scan(TableName=os.environ.get("TABLE_NAME", "Yeetcode_users"))

        if "Items" not in response:
            log.error("Failed to fetch users")
            return

        # Extract users from DynamoDB items
        from aws import normalize_dynamodb_item
        users = [normalize_dynamodb_item(item) for item in response["Items"]]
        log.info(f"👥 Processing {len(users)} users...")

        completion_count = 0

        for user in users:
            username = user.get("username")
            if not username:
                continue

            for bounty in bounties:
                bounty_id = bounty.get("id")

                # Skip bounties with missing IDs
                if not bounty_id:
                    log.warning(f"⚠️ Skipping bounty with missing ID. Bounty keys: {list(bounty.keys())}")
                    continue

                metric = bounty.get("metric", "total").lower()
                required_count = bounty.get("count", 0)

                # Get user's current value for this metric
                user_value = get_user_metric_value(user, metric)

                # Check if user completed the bounty
                if user_value >= required_count:
                    # CACHE-FIRST: Update bounty progress in cache
                    try:
                        success = update_bounty_in_cache(bounty_id, username, user_value)
                        if success:
                            completion_count += 1
                            log.info(f"✅ {username} completed bounty {bounty_id} ({metric}: {user_value}/{required_count})")
                        else:
                            log.error(f"Failed to update bounty progress in cache for {username}/{bounty_id}")
                    except Exception as e:
                        log.error(f"Error updating bounty progress for {username}/{bounty_id}: {e}")

        log.info(f"🏁 Bounty update complete: {completion_count} completions detected")

        # No cache invalidation needed - cache is source of truth now!

    except Exception as e:
        log.error(f"❌ Error in update_bounty_progress: {e}")


# ========================================
# TASK 3: Generate Daily Problem
# ========================================

def fetch_random_problem() -> Optional[Dict]:
    """Fetch a random Easy problem from LeetCode"""
    query = """
    query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
      problemsetQuestionList: questionList(
        categorySlug: $categorySlug,
        limit: $limit,
        skip: $skip,
        filters: $filters
      ) {
        total: totalNum
        questions: data {
          title
          titleSlug
          difficulty
          frontendQuestionId: questionFrontendId
          paidOnly: isPaidOnly
          topicTags {
            name
          }
        }
      }
    }
    """

    for attempt in range(5):
        skip = random.randint(0, 700)
        log.info(f"🎲 Attempt {attempt + 1}: skip index {skip}")

        variables = {
            "categorySlug": "",
            "limit": 1,
            "skip": skip,
            "filters": {"difficulty": "EASY"}
        }

        try:
            response = requests.post("https://leetcode.com/graphql", json={
                "query": query,
                "variables": variables
            }, timeout=10)

            if response.status_code != 200:
                log.error(f"❌ LeetCode API failed with status: {response.status_code}")
                continue

            data = response.json()
            questions = data.get("data", {}).get("problemsetQuestionList", {}).get("questions", [])

            if not questions:
                log.warning("⚠️ No questions found")
                continue

            problem = questions[0]
            if not problem.get("paidOnly"):
                return problem
            else:
                log.info(f"💸 Skipped paid-only problem: {problem['title']}")

        except Exception as e:
            log.error(f"Error fetching problem: {e}")
            continue

    return None


async def generate_daily_problem():
    """
    Background task: Generate a new daily problem
    Runs once daily at 00:00 UTC
    """
    date = datetime.utcnow().strftime("%Y-%m-%d")
    log.info(f"🚀 Generating daily problem for {date}")
    discord_log(f"🚀 Generating daily problem for {date}")

    try:
        # Run in thread pool to avoid blocking
        problem = await asyncio.to_thread(fetch_random_problem)
        if not problem:
            log.error("❌ No valid free problem found after retries")
            discord_log("❌ No valid free problem found after retries")
            return

        # Handle tags safely
        tags = [tag["name"] for tag in problem.get("topicTags", [])]
        if not tags:
            tags = ["No Problem Tags"]

        item = {
            "date": {"S": date},
            "slug": {"S": problem["titleSlug"]},
            "title": {"S": problem["title"]},
            "frontendId": {"S": problem["frontendQuestionId"]},
            "tags": {"SS": tags},
            "users": {"M": {}}
        }

        log.info(f"📥 Saving problem to DynamoDB: {problem['title']}")
        discord_log(f"📥 Saving daily problem: {problem['title']}")

        ddb.put_item(TableName="Daily", Item=item)

        log.info("✅ Daily problem saved successfully")
        discord_log(f"✅ Daily problem set: {problem['titleSlug']}")

        # Invalidate daily caches
        cache_manager.invalidate_all(CacheType.DAILY_PROBLEM)
        cache_manager.invalidate_all(CacheType.DAILY_COMPLETIONS)

    except Exception as e:
        log.error(f"❌ Error generating daily problem: {e}")
        discord_log(f"❌ Error generating daily problem: {e}")

