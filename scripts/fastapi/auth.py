"""
Authentication and rate limiting for YeetCode API
"""

import os
import time
from typing import Dict
from collections import defaultdict
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
security = HTTPBearer()

# Rate limiting storage (in-memory for simplicity)
rate_limit_store: Dict[str, float] = defaultdict(lambda: 0)


def verify_api_key(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify the API key from the Authorization header"""
    api_key = os.getenv("YETCODE_API_KEY")
    
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="Server configuration error: YETCODE_API_KEY not set"
        )
    
    if credentials.credentials != api_key:
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