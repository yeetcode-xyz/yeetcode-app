"""
Authentication routes
"""

import os
from fastapi import APIRouter, Depends, HTTPException
from dotenv import load_dotenv

from models import EmailOTPRequest, EmailOTPResponse
from auth import verify_api_key, check_rate_limit
from email_service import send_email_otp
from aws import VerificationOperations

# Load environment variables
load_dotenv()

router = APIRouter(tags=["Authentication"])

DEBUG_MODE = os.getenv("DEBUG_MODE", "false").lower() == "true"
HOST = os.getenv("HOST", "0.0.0.0")


@router.post("/send-otp", response_model=EmailOTPResponse)
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
        # Skip sending email if host is 0.0.0.0 (development mode)
        if HOST == "0.0.0.0":
            print(f"[DEV] Skipping email send to {email} with code {request.code} (development mode)")
            return EmailOTPResponse(
                success=True,
                message="Verification code sent to your email (dev mode - no actual email sent)",
                message_id="dev-mode-message-id"
            )
        
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


@router.post("/store-verification-code")
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


@router.post("/verify-code")
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


