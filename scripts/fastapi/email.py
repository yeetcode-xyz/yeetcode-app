"""
Email operations for YeetCode using Resend
"""

import os
import time
from typing import Dict
import resend

# Initialize Resend
resend.api_key = os.getenv("RESEND_API_KEY")

DEBUG_MODE = os.getenv("DEBUG_MODE", "false").lower() == "true"


def send_email_otp(email: str, code: str) -> Dict:
    """Send OTP email using Resend"""
    try:
        if not resend.api_key:
            if DEBUG_MODE:
                print(f"[DEBUG] No Resend API key, using mock email for development")
            return {"success": True, "messageId": f"mock-id-{int(time.time())}"}

        if DEBUG_MODE:
            print(f"[DEBUG] Sending email to {email} with code {code}")

        response = resend.Emails.send({
            "from": "YeetCode <auth@yeetcode.xyz>",
            "to": [email],
            "subject": "Your YeetCode Verification Code",
            "html": f"""
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #1a1a1a; font-size: 28px; margin: 0;">🚀 YeetCode</h1>
                        <p style="color: #666; font-size: 16px; margin: 10px 0 0 0;">Competitive LeetCode Platform</p>
                    </div>
                    
                    <div style="background: #f8f9fa; border: 2px solid #000; border-radius: 12px; padding: 30px; text-align: center;">
                        <h2 style="color: #1a1a1a; font-size: 24px; margin: 0 0 20px 0;">Your Verification Code</h2>
                        
                        <div style="background: #fff; border: 3px solid #000; border-radius: 8px; padding: 20px; margin: 20px 0; font-family: 'Courier New', monospace;">
                            <div style="font-size: 36px; font-weight: bold; color: #2563eb; letter-spacing: 8px;">{code}</div>
                        </div>
                        
                        <p style="color: #374151; font-size: 16px; margin: 20px 0 10px 0;">
                            Enter this code in your YeetCode app to continue setting up your account.
                        </p>
                        
                        <p style="color: #6b7280; font-size: 14px; margin: 10px 0;">
                            This code will expire in 10 minutes.
                        </p>
                    </div>
                    
                    <div style="text-align: center; margin-top: 30px; color: #9ca3af; font-size: 12px;">
                        <p>If you didn't request this verification code, you can safely ignore this email.</p>
                        <p>© 2025 YeetCode. Ready to compete?</p>
                    </div>
                </div>
            """
        })
        
        if DEBUG_MODE:
            print(f"[DEBUG] Email sent successfully: {response.get('id')}")
        return {"success": True, "messageId": response.get("id")}
        
    except Exception as error:
        if DEBUG_MODE:
            print(f"[ERROR] Failed to send email: {error}")
        raise Exception(f"Failed to send email: {str(error)}")