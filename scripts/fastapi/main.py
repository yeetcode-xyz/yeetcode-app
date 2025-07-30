#!/usr/bin/env python3
"""
FastAPI server for YeetCode email OTP functionality
"""

import os
import time
from datetime import datetime, timedelta
from typing import Dict, Optional
from collections import defaultdict

from fastapi import FastAPI, HTTPException, Depends, Header, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from dotenv import load_dotenv
import resend

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
security = HTTPBearer()

# Rate limiting storage (in-memory for simplicity)
rate_limit_store: Dict[str, float] = defaultdict(lambda: 0)

# Initialize Resend
resend.api_key = os.getenv("RESEND_API_KEY")

class EmailOTPRequest(BaseModel):
    email: EmailStr
    code: str

class EmailOTPResponse(BaseModel):
    success: bool
    message: str
    message_id: Optional[str] = None
    error: Optional[str] = None

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
            error=str(error)
        )

@app.get("/health")
async def health_check():
    """Health check endpoint with API status"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "resend_configured": bool(resend.api_key)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 