"""
Authentication routes
"""

from fastapi import APIRouter, Depends, HTTPException

from models import EmailOTPRequest, EmailOTPResponse
from auth import verify_api_key, check_rate_limit
from email_service import send_email_otp
from aws import VerificationOperations

router = APIRouter(tags=["Authentication"])

DEBUG_MODE = False


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


@router.post("/cleanup-expired-codes")
async def cleanup_expired_codes_endpoint(
    api_key: str = Depends(verify_api_key)
):
    """Clean up expired verification codes"""
    try:
        result = VerificationOperations.cleanup_expired_codes()
        return {"success": True, "message": f"Cleaned up {result.get('count', 0)} expired codes"}
    except Exception as error:
        return {"success": False, "error": str(error)}