#!/usr/bin/env python3
"""
FastAPI server for YeetCode email OTP functionality
"""

import os
import time
from datetime import datetime
from typing import Dict
from collections import defaultdict

from fastapi import FastAPI, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
import resend

from models import (
    EmailOTPRequest, EmailOTPResponse, UserData, UserResponse,
    GroupRequest, JoinGroupRequest, GroupResponse,
    DailyProblemRequest, DailyProblemResponse,
    BountyRequest, DuelRequest
)
from aws import (
    UserOperations, VerificationOperations, GroupOperations,
    DailyProblemOperations, BountyOperations, DuelOperations,
    USERS_TABLE
)

# Load environment variables
load_dotenv()

app = FastAPI(
    title="YeetCode Email API",
    description="FastAPI server for handling email OTP functionality",
    version="1.0.0"
)

# Configuration
DEBUG_MODE = os.getenv("DEBUG_MODE", "false").lower() == "true"
API_KEY = os.getenv("YETCODE_API_KEY")
PORT = int(os.getenv("PORT"))
HOST = os.getenv("HOST")
security = HTTPBearer()

# Rate limiting storage (in-memory for simplicity)
rate_limit_store: Dict[str, float] = defaultdict(lambda: 0)

# Initialize Resend
resend.api_key = os.getenv("RESEND_API_KEY")


def verify_api_key(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify the API key from the Authorization header"""
    if credentials.credentials != API_KEY:
        raise HTTPException(
            status_code=401,
            detail="Invalid API key"
        )
    return credentials.credentials


def check_rate_limit(email: str) -> bool:
    """Check if user has exceeded rate limit (1 request per minute)"""
    current_time = time.time()
    email_key = email.lower()
    
    # Check if email exists in rate limit store
    if email_key in rate_limit_store:
        last_request_time = rate_limit_store[email_key]
        # Check if 60 seconds have passed since last request
        if current_time - last_request_time < 60:
            return False
    
    # Update last request time
    rate_limit_store[email_key] = current_time
    return True


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
        raise HTTPException(
            status_code=500,
            detail=f"Failed to send email: {str(error)}"
        )


@app.get("/")
async def root():
    """Health check endpoint"""
    return {"message": "YeetCode Email API is running", "timestamp": datetime.now().isoformat()}


@app.get("/health")
async def health_check():
    """Health check endpoint with API status"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "resend_configured": bool(resend.api_key),
        "dynamodb_configured": bool(USERS_TABLE)
    }


# Authentication endpoints
@app.post("/send-otp", response_model=EmailOTPResponse)
async def send_otp(
    request: EmailOTPRequest,
    api_key: str = Depends(verify_api_key)
):
    """
    Send OTP email with rate limiting
    
    - Rate limit: 1 request per minute per email
    - Requires valid API key in Authorization header
    """
    email = request.email.lower()
    
    # Check rate limit
    if not check_rate_limit(email):
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Please wait 60 seconds before requesting another code."
        )
    
    try:
        # Send email with the code provided by frontend
        result = send_email_otp(email, request.code)
        
        if DEBUG_MODE:
            print(f"[DEBUG] OTP sent successfully to {email}")
        
        return EmailOTPResponse(
            success=True,
            message="Verification code sent to your email",
            message_id=result.get("messageId")
        )
        
    except Exception as error:
        if DEBUG_MODE:
            print(f"[ERROR] Failed to send OTP to {email}: {error}")
        return EmailOTPResponse(
            success=False,
            message="Failed to send email",
            error=str(error)
        )


@app.post("/store-verification-code")
async def store_verification_code_endpoint(
    request: EmailOTPRequest,
    api_key: str = Depends(verify_api_key)
):
    """Store verification code in DynamoDB"""
    try:
        success = VerificationOperations.store_verification_code(request.email, request.code)
        return {"success": success, "message": "Verification code stored"}
    except Exception as error:
        return {"success": False, "error": str(error)}


@app.post("/verify-code")
async def verify_code_endpoint(
    request: EmailOTPRequest,
    api_key: str = Depends(verify_api_key)
):
    """Verify code and get user data"""
    try:
        result = VerificationOperations.verify_code_and_get_user(request.email, request.code)
        return result
    except Exception as error:
        return {"success": False, "error": str(error)}


# User endpoints
@app.get("/user/{username}")
async def get_user_endpoint(
    username: str,
    api_key: str = Depends(verify_api_key)
):
    """Get user data from DynamoDB"""
    try:
        user_data = UserOperations.get_user_data(username)
        if user_data:
            return {"success": True, "data": user_data}
        else:
            return {"success": False, "error": "User not found"}
    except Exception as error:
        return {"success": False, "error": str(error)}


@app.put("/user/{username}")
async def update_user_endpoint(
    username: str,
    user_data: UserData,
    api_key: str = Depends(verify_api_key)
):
    """Update user data in DynamoDB"""
    try:
        updates = {}
        if user_data.display_name is not None:
            updates['display_name'] = {'S': user_data.display_name}
        if user_data.email is not None:
            updates['email'] = {'S': user_data.email.lower()}
        if user_data.group_id is not None:
            updates['group_id'] = {'S': user_data.group_id}
            
        success = UserOperations.update_user_data(username, updates)
        return {"success": success, "message": "User updated successfully"}
    except Exception as error:
        return {"success": False, "error": str(error)}


# Group endpoints
@app.post("/create-group")
async def create_group_endpoint(
    request: GroupRequest,
    api_key: str = Depends(verify_api_key)
):
    """Create a new group and assign user as group leader"""
    try:
        result = GroupOperations.create_group(request.username, request.display_name)
        return result
    except Exception as error:
        return {"success": False, "error": str(error)}


@app.post("/join-group")
async def join_group_endpoint(
    request: JoinGroupRequest,
    api_key: str = Depends(verify_api_key)
):
    """Join an existing group using invite code"""
    try:
        result = GroupOperations.join_group(
            request.username, 
            request.invite_code, 
            request.display_name
        )
        return result
    except Exception as error:
        return {"success": False, "error": str(error)}


@app.post("/leave-group")
async def leave_group_endpoint(
    request: GroupRequest,
    api_key: str = Depends(verify_api_key)
):
    """Leave the current group"""
    try:
        result = GroupOperations.leave_group(request.username)
        return result
    except Exception as error:
        return {"success": False, "error": str(error)}


@app.get("/group-stats/{group_id}")
async def get_group_stats_endpoint(
    group_id: str,
    api_key: str = Depends(verify_api_key)
):
    """Get leaderboard stats for a group"""
    try:
        result = GroupOperations.get_group_stats(group_id)
        return result
    except Exception as error:
        return {"success": False, "error": str(error)}


@app.put("/update-display-name")
async def update_display_name_endpoint(
    request: GroupRequest,
    api_key: str = Depends(verify_api_key)
):
    """Update user's display name"""
    try:
        if not request.display_name or not request.display_name.strip():
            return {"success": False, "error": "No display name provided"}
        
        updates = {'display_name': {'S': request.display_name}}
        success = UserOperations.update_user_data(request.username, updates)
        
        if DEBUG_MODE:
            print(f"[DEBUG] Updated display name for {request.username} to {request.display_name}")
        
        return {"success": success}
    except Exception as error:
        return {"success": False, "error": str(error)}


# Daily problem endpoints
@app.get("/daily-problem/{username}")
async def get_daily_problem_endpoint(
    username: str,
    api_key: str = Depends(verify_api_key)
):
    """Get daily problem data for a user"""
    try:
        result = DailyProblemOperations.get_daily_problem_data(username)
        return result
    except Exception as error:
        return {"success": False, "error": str(error)}


@app.post("/complete-daily-problem")
async def complete_daily_problem_endpoint(
    request: DailyProblemRequest,
    api_key: str = Depends(verify_api_key)
):
    """Mark daily problem as completed for a user"""
    try:
        result = DailyProblemOperations.complete_daily_problem(request.username)
        return result
    except Exception as error:
        return {"success": False, "error": str(error)}


# Bounty endpoints
@app.get("/bounties/{username}")
async def get_user_bounties_endpoint(
    username: str,
    api_key: str = Depends(verify_api_key)
):
    """Get bounties for a user"""
    try:
        result = BountyOperations.get_user_bounties(username)
        return result
    except Exception as error:
        return {"success": False, "error": str(error)}


@app.post("/complete-bounty")
async def complete_bounty_endpoint(
    request: BountyRequest,
    api_key: str = Depends(verify_api_key)
):
    """Complete a bounty for a user"""
    try:
        result = BountyOperations.complete_bounty(request.username, request.bounty_id)
        return result
    except Exception as error:
        return {"success": False, "error": str(error)}


@app.post("/update-bounty-progress")
async def update_bounty_progress_endpoint(
    request: dict,
    api_key: str = Depends(verify_api_key)
):
    """Update bounty progress for a user"""
    try:
        username = request.get('username')
        bounty_id = request.get('bounty_id')
        progress = request.get('progress', 0)
        
        if not username or not bounty_id:
            return {"success": False, "error": "Username and bounty_id required"}
        
        result = BountyOperations.update_bounty_progress(username, bounty_id, progress)
        return result
    except Exception as error:
        return {"success": False, "error": str(error)}


# Duel endpoints
@app.get("/duels/{username}")
async def get_user_duels_endpoint(
    username: str,
    api_key: str = Depends(verify_api_key)
):
    """Get duels for a user"""
    try:
        result = DuelOperations.get_user_duels(username)
        return result
    except Exception as error:
        return {"success": False, "error": str(error)}


@app.post("/create-duel")
async def create_duel_endpoint(
    request: DuelRequest,
    api_key: str = Depends(verify_api_key)
):
    """Create a new duel"""
    try:
        result = DuelOperations.create_duel(
            request.username, 
            request.opponent, 
            request.problem_slug
        )
        return result
    except Exception as error:
        return {"success": False, "error": str(error)}


@app.post("/accept-duel")
async def accept_duel_endpoint(
    request: DuelRequest,
    api_key: str = Depends(verify_api_key)
):
    """Accept a duel"""
    try:
        result = DuelOperations.accept_duel(request.username, request.duel_id)
        return result
    except Exception as error:
        return {"success": False, "error": str(error)}


@app.post("/complete-duel")
async def complete_duel_endpoint(
    request: DuelRequest,
    api_key: str = Depends(verify_api_key)
):
    """Complete a duel submission"""
    try:
        # Legacy endpoint - redirects to record submission
        result = DuelOperations.record_duel_submission(request.username, request.duel_id, 0)
        return result
    except Exception as error:
        return {"success": False, "error": str(error)}


@app.post("/reject-duel")
async def reject_duel_endpoint(
    request: dict,
    api_key: str = Depends(verify_api_key)
):
    """Reject a duel"""
    try:
        duel_id = request.get('duel_id')
        if not duel_id:
            return {"success": False, "error": "Duel ID required"}
        
        result = DuelOperations.reject_duel(duel_id)
        return result
    except Exception as error:
        return {"success": False, "error": str(error)}


@app.post("/record-duel-submission")
async def record_duel_submission_endpoint(
    request: dict,
    api_key: str = Depends(verify_api_key)
):
    """Record a duel submission with elapsed time"""
    try:
        username = request.get('username')
        duel_id = request.get('duel_id')
        elapsed_ms = request.get('elapsed_ms', 0)
        
        if not duel_id or not username:
            return {"success": False, "error": "Duel ID and username required"}
        
        result = DuelOperations.record_duel_submission(username, duel_id, elapsed_ms)
        return result
    except Exception as error:
        return {"success": False, "error": str(error)}


@app.get("/duel/{duel_id}")
async def get_duel_endpoint(
    duel_id: str,
    api_key: str = Depends(verify_api_key)
):
    """Get a specific duel by ID"""
    try:
        result = DuelOperations.get_duel_by_id(duel_id)
        return result
    except Exception as error:
        return {"success": False, "error": str(error)}


# Utility endpoints
@app.post("/award-xp")
async def award_xp_endpoint(
    request: dict,
    api_key: str = Depends(verify_api_key)
):
    """Award XP to a user"""
    try:
        username = request.get('username')
        xp_amount = request.get('xp_amount', 0)
        
        if not username:
            return {"success": False, "error": "Username required"}
        
        success = UserOperations.award_xp(username, xp_amount)
        return {"success": success}
    except Exception as error:
        return {"success": False, "error": str(error)}


@app.get("/user-data/{username}")
async def get_user_data_endpoint(
    username: str,
    api_key: str = Depends(verify_api_key)
):
    """Get user data"""
    try:
        user_data = UserOperations.get_user_data(username)
        if user_data:
            return {"success": True, "data": user_data}
        else:
            return {"success": False, "error": "User not found"}
    except Exception as error:
        return {"success": False, "error": str(error)}


@app.put("/user-data/{username}")
async def update_user_data_endpoint(
    username: str,
    user_data: Dict,
    api_key: str = Depends(verify_api_key)
):
    """Update user data"""
    try:
        # Build update expression dynamically
        updates = {}
        
        for key, value in user_data.items():
            if key != 'username':  # Don't update username
                updates[key] = {'S': str(value)} if isinstance(value, str) else {'N': str(value)}
        
        success = UserOperations.update_user_data(username, updates)
        return {"success": success}
    except Exception as error:
        return {"success": False, "error": str(error)}


@app.post("/cleanup-expired-codes")
async def cleanup_expired_codes_endpoint(
    api_key: str = Depends(verify_api_key)
):
    """Clean up expired verification codes"""
    try:
        result = VerificationOperations.cleanup_expired_codes()
        return {"success": True, "message": f"Cleaned up {result.get('count', 0)} expired codes"}
    except Exception as error:
        return {"success": False, "error": str(error)}


@app.post("/cleanup-expired-duels")
async def cleanup_expired_duels_endpoint(
    api_key: str = Depends(verify_api_key)
):
    """Clean up expired duels"""
    try:
        result = DuelOperations.cleanup_expired_duels()
        return {"success": True, "message": f"Cleaned up {result.get('count', 0)} expired duels"}
    except Exception as error:
        return {"success": False, "error": str(error)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=HOST, port=PORT)