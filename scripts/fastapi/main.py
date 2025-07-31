#!/usr/bin/env python3
"""
FastAPI server for YeetCode email OTP functionality
"""

import os
import time
import boto3
from datetime import datetime, timedelta
from typing import Dict, Optional, List
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
PORT = int(os.getenv("PORT"))
HOST = os.getenv("HOST")
security = HTTPBearer()

# Rate limiting storage (in-memory for simplicity)
rate_limit_store: Dict[str, float] = defaultdict(lambda: 0)

# Initialize Resend
resend.api_key = os.getenv("RESEND_API_KEY")

# Initialize DynamoDB
dynamodb = boto3.resource('dynamodb')
ddb = boto3.client('dynamodb')

# DynamoDB Table Names
USERS_TABLE = os.getenv("USERS_TABLE")
DAILY_TABLE = os.getenv("DAILY_TABLE")
DUELS_TABLE = os.getenv("DUELS_TABLE")
BOUNTIES_TABLE = os.getenv("BOUNTIES_TABLE")

class EmailOTPRequest(BaseModel):
    email: EmailStr
    code: str

class EmailOTPResponse(BaseModel):
    success: bool
    message: str
    message_id: Optional[str] = None
    error: Optional[str] = None

class UserData(BaseModel):
    username: str
    display_name: Optional[str] = None
    email: Optional[str] = None
    group_id: Optional[str] = None

class UserResponse(BaseModel):
    success: bool
    data: Optional[Dict] = None
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

# DynamoDB Operations
def get_user_data(username: str) -> Dict:
    """Get user data from DynamoDB"""
    try:
        if not USERS_TABLE:
            raise Exception("USERS_TABLE not configured")
            
        response = ddb.get_item(
            TableName=USERS_TABLE,
            Key={'username': {'S': username.lower()}}
        )
        
        if 'Item' in response:
            raw_item = response['Item']
            
            # Normalize DynamoDB data
            normalized_item = {}
            for key, value in raw_item.items():
                if isinstance(value, dict):
                    if 'S' in value:
                        normalized_item[key] = value['S']
                    elif 'N' in value:
                        normalized_item[key] = int(value['N'])
                    elif 'BOOL' in value:
                        normalized_item[key] = value['BOOL']
                    else:
                        normalized_item[key] = value
                else:
                    normalized_item[key] = value
            
            return normalized_item
        return None
    except Exception as error:
        if DEBUG_MODE:
            print(f"[ERROR] Failed to get user data: {error}")
        raise error

def update_user_data(username: str, updates: Dict) -> bool:
    """Update user data in DynamoDB"""
    try:
        if not USERS_TABLE:
            raise Exception("USERS_TABLE not configured")
            
        # Build update expression
        update_expr = "SET "
        expr_attrs = {}
        expr_values = {}
        
        for key, value in updates.items():
            if value is not None:
                update_expr += f"#{key} = :{key}, "
                expr_attrs[f"#{key}"] = key
                expr_values[f":{key}"] = value
        
        update_expr = update_expr.rstrip(", ")
        
        if not expr_values:
            return True  # Nothing to update
            
        params = {
            'TableName': USERS_TABLE,
            'Key': {'username': {'S': username.lower()}},
            'UpdateExpression': update_expr,
            'ExpressionAttributeNames': expr_attrs,
            'ExpressionAttributeValues': expr_values
        }
        
        ddb.update_item(**params)
        return True
    except Exception as error:
        if DEBUG_MODE:
            print(f"[ERROR] Failed to update user data: {error}")
        raise error

def store_verification_code(email: str, code: str) -> bool:
    """Store verification code in DynamoDB with TTL"""
    try:
        if not USERS_TABLE:
            raise Exception("USERS_TABLE not configured")
            
        ttl = int(time.time()) + 10 * 60  # 10 minutes from now
        
        params = {
            'TableName': USERS_TABLE,
            'Item': {
                'username': {'S': f"verification_{email.lower()}"},
                'email': {'S': email.lower()},
                'verification_code': {'S': code},
                'ttl': {'N': str(ttl)},
                'created_at': {'S': datetime.now().isoformat()}
            }
        }
        
        ddb.put_item(**params)
        return True
    except Exception as error:
        if DEBUG_MODE:
            print(f"[ERROR] Failed to store verification code: {error}")
        raise error

def verify_code_and_get_user(email: str, code: str) -> Dict:
    """Verify code and get user data"""
    try:
        if not USERS_TABLE:
            raise Exception("USERS_TABLE not configured")
            
        # Get verification record
        params = {
            'TableName': USERS_TABLE,
            'Key': {'username': {'S': f"verification_{email.lower()}"}}
        }
        
        response = ddb.get_item(**params)
        
        if 'Item' not in response:
            return {'success': False, 'error': 'Verification code not found'}
            
        stored_code = response['Item']['verification_code']['S']
        stored_ttl = int(response['Item']['ttl']['N'])
        
        # Check if code is expired
        if time.time() > stored_ttl:
            return {'success': False, 'error': 'Verification code expired'}
            
        # Check if code matches
        if stored_code != code:
            return {'success': False, 'error': 'Invalid verification code'}
            
        # Get or create user data
        user_data = get_user_data(email.lower())
        if not user_data:
            # Create new user
            user_params = {
                'TableName': USERS_TABLE,
                'Item': {
                    'username': {'S': email.lower()},
                    'email': {'S': email.lower()},
                    'created_at': {'S': datetime.now().isoformat()}
                }
            }
            ddb.put_item(**user_params)
            user_data = get_user_data(email.lower())
            
        # Clean up verification record
        ddb.delete_item(**params)
        
        return {
            'success': True,
            'data': user_data
        }
    except Exception as error:
        if DEBUG_MODE:
            print(f"[ERROR] Failed to verify code: {error}")
        return {'success': False, 'error': str(error)}

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
        "resend_configured": bool(resend.api_key),
        "dynamodb_configured": bool(USERS_TABLE)
    }

@app.post("/store-verification-code")
async def store_verification_code_endpoint(
    request: EmailOTPRequest,
    api_key: str = Depends(verify_api_key)
):
    """Store verification code in DynamoDB"""
    try:
        success = store_verification_code(request.email, request.code)
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
        result = verify_code_and_get_user(request.email, request.code)
        return result
    except Exception as error:
        return {"success": False, "error": str(error)}

@app.get("/user/{username}")
async def get_user_endpoint(
    username: str,
    api_key: str = Depends(verify_api_key)
):
    """Get user data from DynamoDB"""
    try:
        user_data = get_user_data(username)
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
            
        success = update_user_data(username, updates)
        return {"success": success, "message": "User updated successfully"}
    except Exception as error:
        return {"success": False, "error": str(error)}

# Group-related endpoints
class GroupRequest(BaseModel):
    username: str
    display_name: Optional[str] = None

class JoinGroupRequest(BaseModel):
    username: str
    invite_code: str
    display_name: Optional[str] = None

class GroupResponse(BaseModel):
    success: bool
    group_id: Optional[str] = None
    error: Optional[str] = None

@app.post("/create-group")
async def create_group_endpoint(
    request: GroupRequest,
    api_key: str = Depends(verify_api_key)
):
    """Create a new group and assign user as group leader"""
    try:
        if not USERS_TABLE:
            return {"success": False, "error": "USERS_TABLE not configured"}
        
        normalized_username = request.username.lower()
        
        # Generate a unique 5-digit group ID
        import random
        group_id = str(random.randint(10000, 99999))
        
        # Update user with group_id and display_name
        update_params = {
            'TableName': USERS_TABLE,
            'Key': {'username': {'S': normalized_username}},
            'UpdateExpression': 'SET group_id = :g, display_name = :name',
            'ExpressionAttributeValues': {
                ':g': {'S': group_id},
                ':name': {'S': request.display_name or request.username}
            }
        }
        
        ddb.update_item(**update_params)
        
        if DEBUG_MODE:
            print(f"[DEBUG] Created group {group_id} for user {normalized_username}")
        
        return {"success": True, "group_id": group_id}
        
    except Exception as error:
        if DEBUG_MODE:
            print(f"[ERROR] Failed to create group: {error}")
        return {"success": False, "error": str(error)}

@app.post("/join-group")
async def join_group_endpoint(
    request: JoinGroupRequest,
    api_key: str = Depends(verify_api_key)
):
    """Join an existing group using invite code"""
    try:
        if not USERS_TABLE:
            return {"success": False, "error": "USERS_TABLE not configured"}
        
        normalized_username = request.username.lower()
        
        # Update user with group_id and display_name
        update_params = {
            'TableName': USERS_TABLE,
            'Key': {'username': {'S': normalized_username}},
            'UpdateExpression': 'SET group_id = :g, display_name = :name',
            'ExpressionAttributeValues': {
                ':g': {'S': request.invite_code},
                ':name': {'S': request.display_name or request.username}
            }
        }
        
        ddb.update_item(**update_params)
        
        if DEBUG_MODE:
            print(f"[DEBUG] User {normalized_username} joined group {request.invite_code}")
        
        return {"success": True, "group_id": request.invite_code}
        
    except Exception as error:
        if DEBUG_MODE:
            print(f"[ERROR] Failed to join group: {error}")
        return {"success": False, "error": str(error)}

@app.post("/leave-group")
async def leave_group_endpoint(
    request: GroupRequest,
    api_key: str = Depends(verify_api_key)
):
    """Leave the current group"""
    try:
        if not USERS_TABLE:
            return {"success": False, "error": "USERS_TABLE not configured"}
        
        normalized_username = request.username.lower()
        
        # Remove group_id from user
        update_params = {
            'TableName': USERS_TABLE,
            'Key': {'username': {'S': normalized_username}},
            'UpdateExpression': 'REMOVE group_id'
        }
        
        ddb.update_item(**update_params)
        
        if DEBUG_MODE:
            print(f"[DEBUG] User {normalized_username} left group")
        
        return {"success": True}
        
    except Exception as error:
        if DEBUG_MODE:
            print(f"[ERROR] Failed to leave group: {error}")
        return {"success": False, "error": str(error)}

@app.get("/group-stats/{group_id}")
async def get_group_stats_endpoint(
    group_id: str,
    api_key: str = Depends(verify_api_key)
):
    """Get leaderboard stats for a group"""
    try:
        if not USERS_TABLE:
            return {"success": False, "error": "USERS_TABLE not configured"}
        
        items = []
        
        # Try querying via GSI first
        try:
            query_params = {
                'TableName': USERS_TABLE,
                'IndexName': 'group_id-index',
                'KeyConditionExpression': 'group_id = :g',
                'ExpressionAttributeValues': {':g': {'S': group_id}}
            }
            
            result = ddb.query(**query_params)
            items = result.get('Items', [])
            
        except Exception as gsi_error:
            if DEBUG_MODE:
                print(f"[DEBUG] GSI query failed, falling back to scan: {gsi_error}")
            
            # Fall back to scan + filter
            scan_params = {
                'TableName': USERS_TABLE,
                'FilterExpression': 'group_id = :g',
                'ExpressionAttributeValues': {':g': {'S': group_id}}
            }
            
            try:
                scan_result = ddb.scan(**scan_params)
                items = scan_result.get('Items', [])
            except Exception as scan_error:
                if DEBUG_MODE:
                    print(f"[ERROR] Scan also failed: {scan_error}")
                return {"success": True, "data": []}
        
        # Process items and build leaderboard
        leaderboard = []
        for item in items:
            normalized_username = item['username']['S'].lower()
            display_name = item.get('display_name', {}).get('S', item['username']['S'])
            
            # Auto-fix missing display names
            if not display_name or display_name == 'undefined':
                try:
                    update_params = {
                        'TableName': USERS_TABLE,
                        'Key': {'username': {'S': normalized_username}},
                        'UpdateExpression': 'SET display_name = :name',
                        'ExpressionAttributeValues': {
                            ':name': {'S': item['username']['S']}
                        }
                    }
                    ddb.update_item(**update_params)
                    display_name = item['username']['S']
                except Exception as update_error:
                    if DEBUG_MODE:
                        print(f"[ERROR] Failed to update display name: {update_error}")
                    display_name = item['username']['S']
            
            leaderboard.append({
                'username': normalized_username,
                'name': display_name,
                'easy': int(item.get('easy', {}).get('N', '0')),
                'medium': int(item.get('medium', {}).get('N', '0')),
                'hard': int(item.get('hard', {}).get('N', '0')),
                'today': int(item.get('today', {}).get('N', '0')),
                'xp': int(item.get('xp', {}).get('N', '0'))
            })
        
        if DEBUG_MODE:
            print(f"[DEBUG] Found {len(leaderboard)} users in group {group_id}")
        
        return {"success": True, "data": leaderboard}
        
    except Exception as error:
        if DEBUG_MODE:
            print(f"[ERROR] Failed to get group stats: {error}")
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
        
        if not USERS_TABLE:
            return {"success": False, "error": "USERS_TABLE not configured"}
        
        normalized_username = request.username.lower()
        
        update_params = {
            'TableName': USERS_TABLE,
            'Key': {'username': {'S': normalized_username}},
            'UpdateExpression': 'SET display_name = :name',
            'ExpressionAttributeValues': {
                ':name': {'S': request.display_name}
            }
        }
        
        ddb.update_item(**update_params)
        
        if DEBUG_MODE:
            print(f"[DEBUG] Updated display name for {normalized_username} to {request.display_name}")
        
        return {"success": True}
        
    except Exception as error:
        if DEBUG_MODE:
            print(f"[ERROR] Failed to update display name: {error}")
        return {"success": False, "error": str(error)}

# Daily Problems endpoints
class DailyProblemRequest(BaseModel):
    username: str
    date: Optional[str] = None

class DailyProblemResponse(BaseModel):
    success: bool
    data: Optional[Dict] = None
    error: Optional[str] = None

@app.get("/daily-problem/{username}")
async def get_daily_problem_endpoint(
    username: str,
    api_key: str = Depends(verify_api_key)
):
    """Get daily problem data for a user"""
    try:
        if not DAILY_TABLE:
            return {"success": False, "error": "DAILY_TABLE not configured"}
        
        from datetime import datetime, timedelta
        
        today = datetime.now().strftime('%Y-%m-%d')
        
        # Get today's problem
        todays_params = {
            'TableName': DAILY_TABLE,
            'Key': {'date': {'S': today}}
        }
        
        todays_problem = None
        try:
            todays_result = ddb.get_item(**todays_params)
            if 'Item' in todays_result:
                item = todays_result['Item']
                todays_problem = {
                    'date': item.get('date', {}).get('S'),
                    'slug': item.get('slug', {}).get('S'),
                    'title': item.get('title', {}).get('S'),
                    'frontendId': item.get('frontendId', {}).get('S'),
                    'tags': item.get('tags', {}).get('SS', []),
                    'users': item.get('users', {}).get('M', {})
                }
        except Exception as query_error:
            if DEBUG_MODE:
                print(f"[DEBUG] Direct query failed: {query_error}")
        
        # Get recent problems for streak calculation
        thirty_days_ago = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
        scan_params = {
            'TableName': DAILY_TABLE,
            'FilterExpression': '#date >= :thirtyDaysAgo',
            'ExpressionAttributeNames': {'#date': 'date'},
            'ExpressionAttributeValues': {':thirtyDaysAgo': {'S': thirty_days_ago}}
        }
        
        try:
            scan_result = ddb.scan(**scan_params)
            daily_problems = scan_result.get('Items', [])
        except Exception as scan_error:
            if DEBUG_MODE:
                print(f"[ERROR] Scan failed: {scan_error}")
            daily_problems = []
        
        # Check if user completed today's problem
        daily_complete = False
        if todays_problem and 'users' in todays_problem:
            normalized_username = username.lower()
            daily_complete = normalized_username in todays_problem['users']
        
        # Calculate streak
        streak = 0
        if daily_problems:
            sorted_problems = sorted(daily_problems, key=lambda x: x.get('date', {}).get('S', ''), reverse=True)
            for problem in sorted_problems:
                problem_date = problem.get('date', {}).get('S')
                if problem_date and 'users' in problem:
                    normalized_username = username.lower()
                    if normalized_username in problem.get('users', {}):
                        streak += 1
                    else:
                        break
        
        return {
            "success": True,
            "data": {
                "dailyComplete": daily_complete,
                "streak": streak,
                "todaysProblem": todays_problem
            }
        }
        
    except Exception as error:
        if DEBUG_MODE:
            print(f"[ERROR] Failed to get daily problem: {error}")
        return {"success": False, "error": str(error)}

@app.post("/complete-daily-problem")
async def complete_daily_problem_endpoint(
    request: DailyProblemRequest,
    api_key: str = Depends(verify_api_key)
):
    """Mark daily problem as completed for a user"""
    try:
        if not DAILY_TABLE or not USERS_TABLE:
            return {"success": False, "error": "Tables not configured"}
        
        from datetime import datetime
        
        today = datetime.now().strftime('%Y-%m-%d')
        normalized_username = request.username.lower()
        
        # Update daily problem
        update_daily_params = {
            'TableName': DAILY_TABLE,
            'Key': {'date': {'S': today}},
            'UpdateExpression': 'SET users.#username = :completed',
            'ExpressionAttributeNames': {'#username': normalized_username},
            'ExpressionAttributeValues': {':completed': {'BOOL': True}}
        }
        
        ddb.update_item(**update_daily_params)
        
        # Update user stats
        update_user_params = {
            'TableName': USERS_TABLE,
            'Key': {'username': {'S': normalized_username}},
            'UpdateExpression': 'SET today = :today, xp = if_not_exists(xp, :zero) + :xp',
            'ExpressionAttributeValues': {
                ':today': {'N': '1'},
                ':zero': {'N': '0'},
                ':xp': {'N': '10'}
            }
        }
        
        ddb.update_item(**update_user_params)
        
        if DEBUG_MODE:
            print(f"[DEBUG] User {normalized_username} completed daily problem")
        
        return {"success": True}
        
    except Exception as error:
        if DEBUG_MODE:
            print(f"[ERROR] Failed to complete daily problem: {error}")
        return {"success": False, "error": str(error)}

# Bounties endpoints
class BountyRequest(BaseModel):
    username: str
    bounty_id: Optional[str] = None

@app.get("/bounties/{username}")
async def get_user_bounties_endpoint(
    username: str,
    api_key: str = Depends(verify_api_key)
):
    """Get bounties for a user"""
    try:
        if not BOUNTIES_TABLE:
            return {"success": False, "error": "BOUNTIES_TABLE not configured"}
        
        normalized_username = username.lower()
        
        # Get user's active bounties
        scan_params = {
            'TableName': BOUNTIES_TABLE,
            'FilterExpression': 'username = :username',
            'ExpressionAttributeValues': {':username': {'S': normalized_username}}
        }
        
        try:
            scan_result = ddb.scan(**scan_params)
            bounties = scan_result.get('Items', [])
        except Exception as scan_error:
            if DEBUG_MODE:
                print(f"[ERROR] Bounty scan failed: {scan_error}")
            bounties = []
        
        return {"success": True, "data": bounties}
        
    except Exception as error:
        if DEBUG_MODE:
            print(f"[ERROR] Failed to get bounties: {error}")
        return {"success": False, "error": str(error)}

@app.post("/complete-bounty")
async def complete_bounty_endpoint(
    request: BountyRequest,
    api_key: str = Depends(verify_api_key)
):
    """Complete a bounty for a user"""
    try:
        if not BOUNTIES_TABLE or not USERS_TABLE:
            return {"success": False, "error": "Tables not configured"}
        
        normalized_username = request.username.lower()
        
        # Update bounty completion
        update_bounty_params = {
            'TableName': BOUNTIES_TABLE,
            'Key': {'bounty_id': {'S': request.bounty_id}},
            'UpdateExpression': 'SET completed = :completed, completed_at = :completed_at',
            'ExpressionAttributeValues': {
                ':completed': {'BOOL': True},
                ':completed_at': {'S': datetime.now().isoformat()}
            }
        }
        
        ddb.update_item(**update_bounty_params)
        
        # Update user XP
        update_user_params = {
            'TableName': USERS_TABLE,
            'Key': {'username': {'S': normalized_username}},
            'UpdateExpression': 'SET xp = if_not_exists(xp, :zero) + :xp',
            'ExpressionAttributeValues': {
                ':zero': {'N': '0'},
                ':xp': {'N': '50'}  # Bounty completion XP
            }
        }
        
        ddb.update_item(**update_user_params)
        
        if DEBUG_MODE:
            print(f"[DEBUG] User {normalized_username} completed bounty {request.bounty_id}")
        
        return {"success": True}
        
    except Exception as error:
        if DEBUG_MODE:
            print(f"[ERROR] Failed to complete bounty: {error}")
        return {"success": False, "error": str(error)}

@app.post("/update-bounty-progress")
async def update_bounty_progress_endpoint(
    request: dict,
    api_key: str = Depends(verify_api_key)
):
    """Update bounty progress for a user"""
    try:
        if not BOUNTIES_TABLE or not USERS_TABLE:
            return {"success": False, "error": "Tables not configured"}
        
        username = request.get('username')
        bounty_id = request.get('bounty_id')
        progress = request.get('progress', 0)
        
        if not username or not bounty_id:
            return {"success": False, "error": "Username and bounty_id required"}
        
        normalized_username = username.lower()
        
        # Get current bounty data
        get_bounty_params = {
            'TableName': BOUNTIES_TABLE,
            'Key': {'bounty_id': {'S': bounty_id}}
        }
        
        bounty_result = ddb.get_item(**get_bounty_params)
        if 'Item' not in bounty_result:
            return {"success": False, "error": "Bounty not found"}
        
        bounty_data = bounty_result['Item']
        required_count = int(bounty_data.get('count', {}).get('N', '0'))
        
        # Update bounty progress
        update_bounty_params = {
            'TableName': BOUNTIES_TABLE,
            'Key': {'bounty_id': {'S': bounty_id}},
            'UpdateExpression': 'SET users.#username = :progress',
            'ExpressionAttributeNames': {'#username': normalized_username},
            'ExpressionAttributeValues': {':progress': {'N': str(progress)}}
        }
        
        ddb.update_item(**update_bounty_params)
        
        # Check if bounty was just completed
        was_complete = progress >= required_count
        if was_complete:
            # Award XP
            update_user_params = {
                'TableName': USERS_TABLE,
                'Key': {'username': {'S': normalized_username}},
                'UpdateExpression': 'SET xp = if_not_exists(xp, :zero) + :xp',
                'ExpressionAttributeValues': {
                    ':zero': {'N': '0'},
                    ':xp': {'N': str(bounty_data.get('xp', {}).get('N', '50'))}
                }
            }
            ddb.update_item(**update_user_params)
        
        return {
            "success": True,
            "progress": progress,
            "completed": was_complete,
            "justCompleted": was_complete,
            "xpAwarded": bounty_data.get('xp', {}).get('N', '50') if was_complete else 0
        }
        
    except Exception as error:
        if DEBUG_MODE:
            print(f"[ERROR] Failed to update bounty progress: {error}")
        return {"success": False, "error": str(error)}

# Duels endpoints
class DuelRequest(BaseModel):
    username: str
    duel_id: Optional[str] = None
    opponent: Optional[str] = None
    problem_slug: Optional[str] = None

@app.get("/duels/{username}")
async def get_user_duels_endpoint(
    username: str,
    api_key: str = Depends(verify_api_key)
):
    """Get duels for a user"""
    try:
        if not DUELS_TABLE:
            return {"success": False, "error": "DUELS_TABLE not configured"}
        
        normalized_username = username.lower()
        
        # Get user's duels
        scan_params = {
            'TableName': DUELS_TABLE,
            'FilterExpression': 'challenger = :username OR challengee = :username',
            'ExpressionAttributeValues': {':username': {'S': normalized_username}}
        }
        
        try:
            scan_result = ddb.scan(**scan_params)
            raw_duels = scan_result.get('Items', [])
            
            # Normalize DynamoDB data for duels
            duels = []
            for raw_duel in raw_duels:
                normalized_duel = {}
                for key, value in raw_duel.items():
                    if isinstance(value, dict):
                        if 'S' in value:
                            normalized_duel[key] = value['S']
                        elif 'N' in value:
                            normalized_duel[key] = int(value['N'])
                        elif 'BOOL' in value:
                            normalized_duel[key] = value['BOOL']
                        else:
                            normalized_duel[key] = value
                    else:
                        normalized_duel[key] = value
                duels.append(normalized_duel)
                
        except Exception as scan_error:
            if DEBUG_MODE:
                print(f"[ERROR] Duel scan failed: {scan_error}")
            duels = []
        
        return {"success": True, "data": duels}
        
    except Exception as error:
        if DEBUG_MODE:
            print(f"[ERROR] Failed to get duels: {error}")
        return {"success": False, "error": str(error)}

@app.post("/create-duel")
async def create_duel_endpoint(
    request: DuelRequest,
    api_key: str = Depends(verify_api_key)
):
    """Create a new duel"""
    try:
        if not DUELS_TABLE:
            return {"success": False, "error": "DUELS_TABLE not configured"}
        
        import uuid
        import time
        
        duel_id = str(uuid.uuid4())
        normalized_username = request.username.lower()
        normalized_opponent = request.opponent.lower()
        
        # Create duel record
        put_params = {
            'TableName': DUELS_TABLE,
            'Item': {
                'duelId': {'S': duel_id},
                'challenger': {'S': normalized_username},
                'challengee': {'S': normalized_opponent},
                'problemSlug': {'S': request.problem_slug},
                'status': {'S': 'PENDING'},
                'createdAt': {'S': datetime.now().isoformat()},
                'expires_at': {'N': str(int(time.time()) + 3600)}  # 1 hour
            }
        }
        
        ddb.put_item(**put_params)
        
        if DEBUG_MODE:
            print(f"[DEBUG] Created duel {duel_id} between {normalized_username} and {normalized_opponent}")
        
        return {"success": True, "data": {"duel_id": duel_id}}
        
    except Exception as error:
        if DEBUG_MODE:
            print(f"[ERROR] Failed to create duel: {error}")
        return {"success": False, "error": str(error)}

@app.post("/accept-duel")
async def accept_duel_endpoint(
    request: DuelRequest,
    api_key: str = Depends(verify_api_key)
):
    """Accept a duel"""
    try:
        if not DUELS_TABLE:
            return {"success": False, "error": "DUELS_TABLE not configured"}
        
        normalized_username = request.username.lower()
        
        # Update duel status
        update_params = {
            'TableName': DUELS_TABLE,
            'Key': {'duelId': {'S': request.duel_id}},
            'UpdateExpression': 'SET status = :status, startTime = :startTime',
            'ExpressionAttributeValues': {
                ':status': {'S': 'ACTIVE'},
                ':startTime': {'S': datetime.now().isoformat()}
            }
        }
        
        result = ddb.update_item(**update_params)
        
        if DEBUG_MODE:
            print(f"[DEBUG] User {normalized_username} accepted duel {request.duel_id}")
        
        return {"success": True}
        
    except Exception as error:
        if DEBUG_MODE:
            print(f"[ERROR] Failed to accept duel: {error}")
        return {"success": False, "error": str(error)}

@app.post("/complete-duel")
async def complete_duel_endpoint(
    request: DuelRequest,
    api_key: str = Depends(verify_api_key)
):
    """Complete a duel submission"""
    try:
        if not DUELS_TABLE or not USERS_TABLE:
            return {"success": False, "error": "Tables not configured"}
        
        normalized_username = request.username.lower()
        
        # Get duel details
        get_params = {
            'TableName': DUELS_TABLE,
            'Key': {'duelId': {'S': request.duel_id}}
        }
        
        get_result = ddb.get_item(**get_params)
        if 'Item' not in get_result:
            return {"success": False, "error": "Duel not found"}
        
        duel = get_result['Item']
        
        # Update duel with submission
        update_params = {
            'TableName': DUELS_TABLE,
            'Key': {'duelId': {'S': request.duel_id}},
            'UpdateExpression': 'SET challengerTime = :challengerTime, challengeeTime = :challengeeTime, status = :status, winner = :winner, xpAwarded = :xpAwarded',
            'ExpressionAttributeValues': {
                ':challengerTime': {'N': '0'},
                ':challengeeTime': {'N': '0'},
                ':status': {'S': 'COMPLETED'},
                ':winner': {'S': normalized_username},
                ':xpAwarded': {'N': '300'}
            }
        }
        
        update_result = ddb.update_item(**update_params)
        
        # Award XP to user
        update_user_params = {
            'TableName': USERS_TABLE,
            'Key': {'username': {'S': normalized_username}},
            'UpdateExpression': 'SET xp = if_not_exists(xp, :zero) + :xp',
            'ExpressionAttributeValues': {
                ':zero': {'N': '0'},
                ':xp': {'N': '25'}  # Duel completion XP
            }
        }
        
        ddb.update_item(**update_user_params)
        
        if DEBUG_MODE:
            print(f"[DEBUG] User {normalized_username} completed duel {request.duel_id}")
        
        return {"success": True}
        
    except Exception as error:
        if DEBUG_MODE:
            print(f"[ERROR] Failed to complete duel: {error}")
        return {"success": False, "error": str(error)}

@app.post("/reject-duel")
async def reject_duel_endpoint(
    request: dict,
    api_key: str = Depends(verify_api_key)
):
    """Reject a duel"""
    try:
        if not DUELS_TABLE:
            return {"success": False, "error": "DUELS_TABLE not configured"}
        
        duel_id = request.get('duel_id')
        if not duel_id:
            return {"success": False, "error": "Duel ID required"}
        
        # Delete duel record
        delete_params = {
            'TableName': DUELS_TABLE,
            'Key': {'duelId': {'S': duel_id}}
        }
        
        ddb.delete_item(**delete_params)
        
        if DEBUG_MODE:
            print(f"[DEBUG] Duel {duel_id} rejected and deleted")
        
        return {"success": True, "duel_id": duel_id}
        
    except Exception as error:
        if DEBUG_MODE:
            print(f"[ERROR] Failed to reject duel: {error}")
        return {"success": False, "error": str(error)}

@app.post("/record-duel-submission")
async def record_duel_submission_endpoint(
    request: dict,
    api_key: str = Depends(verify_api_key)
):
    """Record a duel submission with elapsed time"""
    try:
        if not DUELS_TABLE or not USERS_TABLE:
            return {"success": False, "error": "Tables not configured"}
        
        duel_id = request.get('duel_id')
        username = request.get('username')
        elapsed_ms = request.get('elapsed_ms', 0)
        
        if not duel_id or not username:
            return {"success": False, "error": "Duel ID and username required"}
        
        normalized_username = username.lower()
        
        # Get duel details
        get_params = {
            'TableName': DUELS_TABLE,
            'Key': {'duelId': {'S': duel_id}}
        }
        
        get_result = ddb.get_item(**get_params)
        if 'Item' not in get_result:
            return {"success": False, "error": "Duel not found"}
        
        duel = get_result['Item']
        
        # Update duel with submission
        update_params = {
            'TableName': DUELS_TABLE,
            'Key': {'duelId': {'S': duel_id}},
            'UpdateExpression': 'SET challengerTime = :challengerTime, challengeeTime = :challengeeTime, status = :status, winner = :winner, xpAwarded = :xpAwarded',
            'ExpressionAttributeValues': {
                ':challengerTime': {'N': str(elapsed_ms)},
                ':challengeeTime': {'N': '0'},
                ':status': {'S': 'COMPLETED'},
                ':winner': {'S': normalized_username},
                ':xpAwarded': {'N': '300'}
            }
        }
        
        ddb.update_item(**update_params)
        
        # Award XP to user
        update_user_params = {
            'TableName': USERS_TABLE,
            'Key': {'username': {'S': normalized_username}},
            'UpdateExpression': 'SET xp = if_not_exists(xp, :zero) + :xp',
            'ExpressionAttributeValues': {
                ':zero': {'N': '0'},
                ':xp': {'N': '25'}  # Duel completion XP
            }
        }
        
        ddb.update_item(**update_user_params)
        
        if DEBUG_MODE:
            print(f"[DEBUG] User {normalized_username} completed duel {duel_id} in {elapsed_ms}ms")
        
        return {"success": True}
        
    except Exception as error:
        if DEBUG_MODE:
            print(f"[ERROR] Failed to record duel submission: {error}")
        return {"success": False, "error": str(error)}

@app.post("/award-xp")
async def award_xp_endpoint(
    request: dict,
    api_key: str = Depends(verify_api_key)
):
    """Award XP to a user"""
    try:
        if not USERS_TABLE:
            return {"success": False, "error": "USERS_TABLE not configured"}
        
        username = request.get('username')
        xp_amount = request.get('xp_amount', 0)
        
        if not username:
            return {"success": False, "error": "Username required"}
        
        normalized_username = username.lower()
        
        update_params = {
            'TableName': USERS_TABLE,
            'Key': {'username': {'S': normalized_username}},
            'UpdateExpression': 'SET xp = if_not_exists(xp, :zero) + :xp',
            'ExpressionAttributeValues': {
                ':zero': {'N': '0'},
                ':xp': {'N': str(xp_amount)}
            }
        }
        
        ddb.update_item(**update_params)
        
        if DEBUG_MODE:
            print(f"[DEBUG] Awarded {xp_amount} XP to user {normalized_username}")
        
        return {"success": True}
        
    except Exception as error:
        if DEBUG_MODE:
            print(f"[ERROR] Failed to award XP: {error}")
        return {"success": False, "error": str(error)}

# User data endpoints
@app.get("/user-data/{username}")
async def get_user_data_endpoint(
    username: str,
    api_key: str = Depends(verify_api_key)
):
    """Get user data"""
    try:
        if not USERS_TABLE:
            return {"success": False, "error": "USERS_TABLE not configured"}
        
        normalized_username = username.lower()
        
        params = {
            'TableName': USERS_TABLE,
            'Key': {'username': {'S': normalized_username}}
        }
        
        result = ddb.get_item(**params)
        raw_user_data = result.get('Item', {})
        
        # Normalize DynamoDB data
        user_data = {}
        for key, value in raw_user_data.items():
            if isinstance(value, dict):
                if 'S' in value:
                    user_data[key] = value['S']
                elif 'N' in value:
                    user_data[key] = int(value['N'])
                elif 'BOOL' in value:
                    user_data[key] = value['BOOL']
                else:
                    user_data[key] = value
            else:
                user_data[key] = value
        
        return {"success": True, "data": user_data}
        
    except Exception as error:
        if DEBUG_MODE:
            print(f"[ERROR] Failed to get user data: {error}")
        return {"success": False, "error": str(error)}

@app.put("/user-data/{username}")
async def update_user_data_endpoint(
    username: str,
    user_data: Dict,
    api_key: str = Depends(verify_api_key)
):
    """Update user data"""
    try:
        if not USERS_TABLE:
            return {"success": False, "error": "USERS_TABLE not configured"}
        
        normalized_username = username.lower()
        
        # Build update expression dynamically
        update_expression = "SET "
        expression_values = {}
        expression_names = {}
        
        for key, value in user_data.items():
            if key != 'username':  # Don't update username
                update_expression += f"#{key} = :{key}, "
                expression_names[f"#{key}"] = key
                expression_values[f":{key}"] = {'S': str(value)} if isinstance(value, str) else {'N': str(value)}
        
        update_expression = update_expression.rstrip(", ")
        
        update_params = {
            'TableName': USERS_TABLE,
            'Key': {'username': {'S': normalized_username}},
            'UpdateExpression': update_expression,
            'ExpressionAttributeNames': expression_names,
            'ExpressionAttributeValues': expression_values
        }
        
        ddb.update_item(**update_params)
        
        if DEBUG_MODE:
            print(f"[DEBUG] Updated user data for {normalized_username}")
        
        return {"success": True}
        
    except Exception as error:
        if DEBUG_MODE:
            print(f"[ERROR] Failed to update user data: {error}")
        return {"success": False, "error": str(error)}

@app.post("/cleanup-expired-codes")
async def cleanup_expired_codes_endpoint(
    api_key: str = Depends(verify_api_key)
):
    """Clean up expired verification codes"""
    try:
        if not USERS_TABLE:
            return {"success": False, "error": "USERS_TABLE not configured"}
        
        now = int(time.time())
        
        # Scan for verification records that have expired
        scan_params = {
            'TableName': USERS_TABLE,
            'FilterExpression': 'begins_with(username, :prefix) AND ttl < :now',
            'ExpressionAttributeValues': {
                ':prefix': {'S': 'verification_'},
                ':now': {'N': str(now)},
            },
        }
        
        scan_result = ddb.scan(**scan_params)
        expired_records = scan_result.get('Items', [])
        
        if expired_records:
            if DEBUG_MODE:
                print(f"[DEBUG] Found {len(expired_records)} expired verification records")
            
            # Delete expired records
            for record in expired_records:
                delete_params = {
                    'TableName': USERS_TABLE,
                    'Key': {'username': record['username']},
                }
                ddb.delete_item(**delete_params)
            
            if DEBUG_MODE:
                print(f"[DEBUG] Cleaned up {len(expired_records)} expired verification records")
        
        return {"success": True}
        
    except Exception as error:
        if DEBUG_MODE:
            print(f"[ERROR] Failed to cleanup expired codes: {error}")
        return {"success": False, "error": str(error)}

@app.post("/cleanup-expired-duels")
async def cleanup_expired_duels_endpoint(
    api_key: str = Depends(verify_api_key)
):
    """Clean up expired duels"""
    try:
        if not DUELS_TABLE:
            return {"success": False, "error": "DUELS_TABLE not configured"}
        
        now = int(time.time())
        three_hours_ago = now - 3 * 60 * 60  # 3 hours for pending duels
        two_hours_ago = now - 2 * 60 * 60    # 2 hours for active duels
        
        # Scan for expired duels
        scan_params = {
            'TableName': DUELS_TABLE,
            'FilterExpression': '(#status = :pending AND createdAt < :threeHoursAgo) OR (#status = :active AND startTime < :twoHoursAgo)',
            'ExpressionAttributeNames': {
                '#status': 'status',
            },
            'ExpressionAttributeValues': {
                ':pending': {'S': 'PENDING'},
                ':active': {'S': 'ACTIVE'},
                ':threeHoursAgo': {'S': datetime.fromtimestamp(three_hours_ago).isoformat()},
                ':twoHoursAgo': {'S': datetime.fromtimestamp(two_hours_ago).isoformat()},
            },
        }
        
        scan_result = ddb.scan(**scan_params)
        expired_duels = scan_result.get('Items', [])
        
        if expired_duels:
            if DEBUG_MODE:
                print(f"[DEBUG] Found {len(expired_duels)} expired duels")
            
            # Delete expired duels
            for duel in expired_duels:
                delete_params = {
                    'TableName': DUELS_TABLE,
                    'Key': {'duel_id': duel['duel_id']},
                }
                ddb.delete_item(**delete_params)
                
                if DEBUG_MODE:
                    print(f"[DEBUG] Deleted expired duel: {duel['duel_id']['S']} (status: {duel['status']['S']})")
            
            if DEBUG_MODE:
                print(f"[DEBUG] Cleaned up {len(expired_duels)} expired duels")
        
        return {"success": True}
        
    except Exception as error:
        if DEBUG_MODE:
            print(f"[ERROR] Failed to cleanup expired duels: {error}")
        return {"success": False, "error": str(error)}

@app.get("/duel/{duel_id}")
async def get_duel_endpoint(
    duel_id: str,
    api_key: str = Depends(verify_api_key)
):
    """Get a specific duel by ID"""
    try:
        if not DUELS_TABLE:
            return {"success": False, "error": "DUELS_TABLE not configured"}
        
        get_params = {
            'TableName': DUELS_TABLE,
            'Key': {'duelId': {'S': duel_id}},
        }
        
        result = ddb.get_item(**get_params)
        if 'Item' not in result:
            return {"success": False, "error": "Duel not found"}
        
        duel_item = result['Item']
        duel = {
            'duelId': duel_item.get('duelId', {}).get('S'),
            'challenger': duel_item.get('challenger', {}).get('S'),
            'challengee': duel_item.get('challengee', {}).get('S'),
            'difficulty': duel_item.get('difficulty', {}).get('S'),
            'status': duel_item.get('status', {}).get('S'),
            'problemSlug': duel_item.get('problemSlug', {}).get('S'),
            'problemTitle': duel_item.get('problemTitle', {}).get('S'),
            'createdAt': duel_item.get('createdAt', {}).get('S'),
            'startTime': duel_item.get('startTime', {}).get('S'),
            'challengerTime': int(duel_item.get('challengerTime', {}).get('N', '0')),
            'challengeeTime': int(duel_item.get('challengeeTime', {}).get('N', '0')),
            'winner': duel_item.get('winner', {}).get('S'),
            'xpAwarded': int(duel_item.get('xpAwarded', {}).get('N', '0')),
        }
        
        return {"success": True, "data": duel}
        
    except Exception as error:
        if DEBUG_MODE:
            print(f"[ERROR] Failed to get duel: {error}")
        return {"success": False, "error": str(error)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=HOST, port=PORT) 