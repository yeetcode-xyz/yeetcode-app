"""
Discord webhook utility for sending notifications
"""

import os
import requests
from dotenv import load_dotenv
from logger import info, error, debug

# Load environment variables
load_dotenv()

DISCORD_WEBHOOK_URL = os.getenv('DISCORD_WEBHOOK_URL')

def send_new_user_notification(username: str, email: str, display_name: str, university: str = None):
    """Send a Discord notification when a new user signs up"""
    if not DISCORD_WEBHOOK_URL:
        debug("Discord webhook URL not configured, skipping notification")
        return

    try:
        # Create embed for better formatting
        embed = {
            "title": "🎉 New User Joined YeetCode!",
            "color": 5814783,  # Blue color
            "fields": [
                {
                    "name": "Display Name",
                    "value": display_name or username,
                    "inline": True
                },
                {
                    "name": "LeetCode Username",
                    "value": f"[{username}](https://leetcode.com/u/{username}/)",
                    "inline": True
                },
                {
                    "name": "Email",
                    "value": email,
                    "inline": False
                }
            ]
        }

        # Add university field if provided
        if university and university not in ["", "undefined", "Other"]:
            embed["fields"].append({
                "name": "🎓 University",
                "value": university,
                "inline": False
            })

        payload = {
            "embeds": [embed]
        }

        response = requests.post(
            DISCORD_WEBHOOK_URL,
            json=payload,
            timeout=5
        )

        if response.status_code == 204:
            info(f"Discord notification sent for new user: {username}")
        elif response.status_code == 404:
            error(f"Discord webhook not found (404) - webhook may have been deleted or regenerated")
        elif response.status_code == 429:
            error(f"Discord webhook rate limited (429) - too many requests")
        else:
            error(f"Discord webhook failed with status {response.status_code}: {response.text}")

    except Exception as e:
        error(f"Failed to send Discord notification: {e}")


def test_webhook():
    """Send a test notification to verify webhook is working"""
    if not DISCORD_WEBHOOK_URL:
        print("[ERROR] DISCORD_WEBHOOK_URL not configured in .env")
        return False

    try:
        print(f"[INFO] Testing Discord webhook: {DISCORD_WEBHOOK_URL[:50]}...")

        # Send test notification
        send_new_user_notification(
            username="test_user",
            email="test@yeetcode.com",
            display_name="Test User",
            university="Test University"
        )

        print("[SUCCESS] Test webhook sent! Check your Discord channel.")
        return True

    except Exception as e:
        print(f"[ERROR] Test webhook failed: {e}")
        return False


if __name__ == "__main__":
    # Allow running this file directly to test webhook
    test_webhook()
