"""
AWS DynamoDB operations for YeetCode
"""

import os
import time
import boto3
from datetime import datetime, timezone
from typing import Dict, Optional, List, Any
from botocore.exceptions import ClientError
from dotenv import load_dotenv
from logger import debug, info, warning, error, duel_action, duel_check, submission_check

# Load environment variables
load_dotenv()

# Initialize DynamoDB
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
dynamodb = boto3.resource('dynamodb', region_name=AWS_REGION)
ddb = boto3.client('dynamodb', region_name=AWS_REGION)

# DynamoDB Table Names
USERS_TABLE = os.getenv("USERS_TABLE")
DAILY_TABLE = os.getenv("DAILY_TABLE")
DUELS_TABLE = os.getenv("DUELS_TABLE")
BOUNTIES_TABLE = os.getenv("BOUNTIES_TABLE")
GROUPS_TABLE = os.getenv("GROUPS_TABLE")

DEBUG_MODE = os.getenv("DEBUG_MODE", "false").lower() == "true"


def normalize_dynamodb_item(item: Dict) -> Dict:
    """Normalize DynamoDB data structure to regular Python dict"""
    normalized = {}
    for key, value in item.items():
        if isinstance(value, dict):
            if 'S' in value:
                normalized[key] = value['S']
            elif 'N' in value:
                normalized[key] = int(float(value['N']))
            elif 'BOOL' in value:
                normalized[key] = value['BOOL']
            elif 'M' in value:
                normalized[key] = normalize_dynamodb_item(value['M'])
            elif 'L' in value:
                # Handle DynamoDB List
                normalized[key] = [normalize_dynamodb_item(item) if isinstance(item, dict) else item for item in value['L']]
            elif 'SS' in value:
                normalized[key] = value['SS']
            else:
                normalized[key] = value
        else:
            normalized[key] = value
    return normalized


class UserOperations:
    """User-related DynamoDB operations"""
    
    @staticmethod
    def get_user_data(username: str) -> Optional[Dict]:
        """Get user data from DynamoDB"""
        try:
            if not USERS_TABLE:
                raise Exception("USERS_TABLE not configured")
                
            response = ddb.get_item(
                TableName=USERS_TABLE,
                Key={'username': {'S': username.lower()}}
            )
            
            if 'Item' in response:
                return normalize_dynamodb_item(response['Item'])
            return None
        except Exception as error:
            if DEBUG_MODE:
                print(f"[ERROR] Failed to get user data: {error}")
            raise error
    
    @staticmethod
    def get_user_by_email(email: str) -> Optional[Dict]:
        """Get user data by email from DynamoDB"""
        try:
            if not USERS_TABLE:
                raise Exception("USERS_TABLE not configured")
            
            # Scan the table to find user by email
            # Note: In production, you might want to create a GSI on email
            response = ddb.scan(
                TableName=USERS_TABLE,
                FilterExpression='email = :email',
                ExpressionAttributeValues={
                    ':email': {'S': email.lower()}
                }
            )
            
            if 'Items' in response and response['Items']:
                # If multiple users found, prefer the one that has completed onboarding (username !== email)
                items = [normalize_dynamodb_item(item) for item in response['Items']]
                
                # Sort by completion status and group membership
                # Priority: 1) Completed onboarding (username !== email), 2) Has group_id
                items.sort(key=lambda x: (x.get('username') == x.get('email'), not x.get('group_id')))
                
                if DEBUG_MODE:
                    print(f"[DEBUG] Found {len(items)} users for email {email}: {items}")
                
                return items[0]  # Return the most complete user record
            return None
        except Exception as error:
            if DEBUG_MODE:
                print(f"[ERROR] Failed to get user by email: {error}")
            raise error
    
    @staticmethod
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
    

    
    @staticmethod
    def create_user_with_username(username: str, email: str, display_name: str = None, university: str = None) -> Dict:
        """Create new user with specific username and email"""
        try:
            if not USERS_TABLE:
                raise Exception("USERS_TABLE not configured")
            
            # Ensure email is lowercase
            normalized_email = email.lower()
            normalized_username = username.lower()
            
            user_params = {
                'TableName': USERS_TABLE,
                'Item': {
                    'username': {'S': normalized_username},
                    'email': {'S': normalized_email},
                    'display_name': {'S': display_name or username},
                    'created_at': {'S': datetime.now(timezone.utc).isoformat()},
                    'updated_at': {'S': datetime.now(timezone.utc).isoformat()}
                }
            }
            
            # Add university if provided
            if university:
                user_params['Item']['university'] = {'S': university}
            
            ddb.put_item(**user_params)
            
            if DEBUG_MODE:
                print(f"[DEBUG] Created user with username {normalized_username} and email {normalized_email}, university {university}")
            
            return UserOperations.get_user_data(normalized_username)
        except Exception as error:
            if DEBUG_MODE:
                print(f"[ERROR] Failed to create user with username: {error}")
            raise error
    
    @staticmethod
    def award_xp(username: str, xp_amount: int) -> bool:
        """Award XP to a user"""
        try:
            if not USERS_TABLE:
                raise Exception("USERS_TABLE not configured")
            
            update_params = {
                'TableName': USERS_TABLE,
                'Key': {'username': {'S': username.lower()}},
                'UpdateExpression': 'SET xp = if_not_exists(xp, :zero) + :xp',
                'ExpressionAttributeValues': {
                    ':zero': {'N': '0'},
                    ':xp': {'N': str(xp_amount)}
                }
            }
            
            ddb.update_item(**update_params)
            
            if DEBUG_MODE:
                print(f"[DEBUG] Awarded {xp_amount} XP to user {username}")
            
            return True
        except Exception as error:
            if DEBUG_MODE:
                print(f"[ERROR] Failed to award XP: {error}")
            raise error
    
    @staticmethod
    def get_all_users_for_university_leaderboard() -> Dict:
        """Get all users with their university information for leaderboard"""
        try:
            if not USERS_TABLE:
                raise Exception("USERS_TABLE not configured")
            
            # Scan all users from the table
            items = []
            last_evaluated_key = None
            
            while True:
                scan_params = {
                    'TableName': USERS_TABLE,
                    'Select': 'ALL_ATTRIBUTES'
                }
                
                if last_evaluated_key:
                    scan_params['ExclusiveStartKey'] = last_evaluated_key
                
                response = ddb.scan(**scan_params)
                items.extend(response.get('Items', []))
                
                last_evaluated_key = response.get('LastEvaluatedKey')
                if not last_evaluated_key:
                    break
            
            # Normalize the data
            normalized_users = []
            for item in items:
                user = normalize_dynamodb_item(item)
                # Only include users with university information
                if user.get('university'):
                    normalized_users.append({
                        'username': user.get('username', ''),
                        'university': user.get('university', ''),
                        'easy': user.get('easy', 0),
                        'medium': user.get('medium', 0),
                        'hard': user.get('hard', 0),
                        'xp': user.get('xp', 0)
                    })
            
            if DEBUG_MODE:
                print(f"[DEBUG] Found {len(normalized_users)} users with university information")
            
            return {"success": True, "data": normalized_users}
        except Exception as error:
            if DEBUG_MODE:
                print(f"[ERROR] Failed to get users for university leaderboard: {error}")
            return {"success": False, "error": str(error)}


class VerificationOperations:
    """Verification code operations"""
    
    @staticmethod
    def store_verification_code(email: str, code: str) -> bool:
        """Store verification code in DynamoDB with TTL"""
        try:
            if not USERS_TABLE:
                raise Exception("USERS_TABLE not configured")
                
            # Ensure email is lowercase
            normalized_email = email.lower()
            ttl = int(time.time()) + 10 * 60  # 10 minutes from now
            
            params = {
                'TableName': USERS_TABLE,
                'Item': {
                    'username': {'S': f"verification_{normalized_email}"},
                    'email': {'S': normalized_email},
                    'verification_code': {'S': code},
                    'ttl': {'N': str(ttl)},
                    'created_at': {'S': datetime.now(timezone.utc).isoformat()}
                }
            }
            
            ddb.put_item(**params)
            return True
        except Exception as error:
            if DEBUG_MODE:
                print(f"[ERROR] Failed to store verification code: {error}")
            raise error
    
    @staticmethod
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
                
            # Get existing user data by email
            user_data = UserOperations.get_user_by_email(email)
            
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
    
    @staticmethod
    def cleanup_expired_codes() -> Dict:
        """Clean up expired verification codes"""
        try:
            if not USERS_TABLE:
                raise Exception("USERS_TABLE not configured")
            
            now = int(time.time())
            
            # Scan for verification records that have expired
            scan_params = {
                'TableName': USERS_TABLE,
                'FilterExpression': 'begins_with(username, :prefix) AND #ttl < :now',
                'ExpressionAttributeNames': {
                    '#ttl': 'ttl'
                },
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
            
            return {"success": True, "count": len(expired_records)}
            
        except Exception as error:
            if DEBUG_MODE:
                print(f"[ERROR] Failed to cleanup expired codes: {error}")
            raise error


class GroupOperations:
    """Group-related operations"""
    
    @staticmethod
    def create_group(username: str, display_name: Optional[str] = None) -> Dict:
        """Create a new group and assign user as group leader"""
        try:
            if not USERS_TABLE:
                raise Exception("USERS_TABLE not configured")
            
            normalized_username = username.lower()
            
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
                    ':name': {'S': display_name or username}
                }
            }
            
            ddb.update_item(**update_params)
            
            if DEBUG_MODE:
                print(f"[DEBUG] Created group {group_id} for user {normalized_username}")
            
            return {"success": True, "group_id": group_id}
            
        except Exception as error:
            if DEBUG_MODE:
                print(f"[ERROR] Failed to create group: {error}")
            raise error
    
    @staticmethod
    def join_group(username: str, invite_code: str, display_name: Optional[str] = None) -> Dict:
        """Join an existing group using invite code"""
        try:
            if not USERS_TABLE:
                raise Exception("USERS_TABLE not configured")
            
            normalized_username = username.lower()
            
            # Update user with group_id and display_name
            update_params = {
                'TableName': USERS_TABLE,
                'Key': {'username': {'S': normalized_username}},
                'UpdateExpression': 'SET group_id = :g, display_name = :name',
                'ExpressionAttributeValues': {
                    ':g': {'S': invite_code},
                    ':name': {'S': display_name or username}
                }
            }
            
            ddb.update_item(**update_params)
            
            if DEBUG_MODE:
                print(f"[DEBUG] User {normalized_username} joined group {invite_code}")
            
            return {"success": True, "group_id": invite_code}
            
        except Exception as error:
            if DEBUG_MODE:
                print(f"[ERROR] Failed to join group: {error}")
            raise error
    
    @staticmethod
    def leave_group(username: str) -> Dict:
        """Leave the current group"""
        try:
            if not USERS_TABLE:
                raise Exception("USERS_TABLE not configured")
            
            normalized_username = username.lower()
            
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
            raise error
    
    @staticmethod
    def get_group_stats(group_id: str) -> Dict:
        """Get leaderboard stats for a group"""
        try:
            if not USERS_TABLE:
                raise Exception("USERS_TABLE not configured")
            
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
            raise error


class DailyProblemOperations:
    """Daily problem operations"""
    
    @staticmethod
    def get_daily_problem_data(username: str) -> Dict:
        """Get latest problem data for a user"""
        try:
            if not DAILY_TABLE:
                raise Exception("DAILY_TABLE not configured")
            
            from datetime import datetime, timezone, timedelta
            
            # Try to get today's problem first (most likely case)
            today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
            latest_problem = None
            
            try:
                # Query for today's problem directly using the date key
                query_params = {
                    'TableName': DAILY_TABLE,
                    'KeyConditionExpression': '#date = :today',
                    'ExpressionAttributeNames': {'#date': 'date'},
                    'ExpressionAttributeValues': {':today': {'S': today}}
                }
                
                query_result = ddb.query(**query_params)
                items = query_result.get('Items', [])
                
                if items:
                    latest_item = items[0]  # Today's problem found
                else:
                    # Fallback: scan for the most recent problem if today's not found
                    scan_params = {
                        'TableName': DAILY_TABLE
                    }
                    scan_result = ddb.scan(**scan_params)
                    all_problems = scan_result.get('Items', [])
                    
                    if all_problems:
                        # Sort by date to get the latest problem
                        sorted_problems = sorted(all_problems, key=lambda x: x.get('date', {}).get('S', ''), reverse=True)
                        latest_item = sorted_problems[0]
                    else:
                        latest_item = None
                
                # Normalize the item to get proper field names if we found one
                if latest_item:
                    normalized_item = normalize_dynamodb_item(latest_item)
                    latest_problem = {
                        'date': normalized_item.get('date'),
                        'titleSlug': normalized_item.get('slug'),  # For LeetCode URL
                        'title': normalized_item.get('title'),
                        'frontendId': normalized_item.get('frontendId'),
                        'topicTags': normalized_item.get('tags', []),  # Frontend expects topicTags
                        'difficulty': normalized_item.get('difficulty', 'Medium'),  # Default difficulty
                        'content': normalized_item.get('content', ''),  # Problem description
                        'users': normalized_item.get('users', {})
                    }
            except Exception as query_error:
                if DEBUG_MODE:
                    print(f"[DEBUG] Scan failed: {query_error}")
            
            # Get recent problems for streak calculation
            ninety_days_ago = (datetime.now() - timedelta(days=90)).strftime('%Y-%m-%d')
            scan_params = {
                'TableName': DAILY_TABLE,
                'FilterExpression': '#date >= :ninetyDaysAgo',
                'ExpressionAttributeNames': {'#date': 'date'},
                'ExpressionAttributeValues': {':ninetyDaysAgo': {'S': ninety_days_ago}}
            }
            
            try:
                scan_result = ddb.scan(**scan_params)
                raw_daily_problems = scan_result.get('Items', [])
                # Normalize the DynamoDB items for consistent access
                daily_problems = [normalize_dynamodb_item(item) for item in raw_daily_problems]
            except Exception as scan_error:
                if DEBUG_MODE:
                    print(f"[ERROR] Scan failed: {scan_error}")
                daily_problems = []
            
            # Check if user completed the latest problem
            daily_complete = False
            if latest_problem and 'users' in latest_problem:
                normalized_username = username.lower()
                users_data = latest_problem['users']
                
                # Check if user exists in users and is marked as completed
                if normalized_username in users_data:
                    user_completion = users_data[normalized_username]
                    # Handle both boolean and nested boolean structure
                    if isinstance(user_completion, bool):
                        daily_complete = user_completion
                    elif isinstance(user_completion, dict) and user_completion.get('BOOL'):
                        daily_complete = user_completion['BOOL']
                    else:
                        daily_complete = True  # Default to true if user exists in the users field
            
            # Calculate streak - count consecutive completed problems from database entries
            streak = 0
            if daily_problems:
                normalized_username = username.lower()
                
                # Sort problems by date (newest first) and count consecutive completions
                sorted_problems = sorted(daily_problems, key=lambda x: x.get('date', ''), reverse=True)
                
                for problem in sorted_problems:
                    problem_date = problem.get('date')
                    if problem_date and 'users' in problem:
                        users_data = problem.get('users', {})
                        
                        # Check if user completed this problem (same logic as daily_complete)
                        user_completed = False
                        if normalized_username in users_data:
                            user_completion = users_data[normalized_username]
                            if isinstance(user_completion, bool):
                                user_completed = user_completion
                            elif isinstance(user_completion, dict) and user_completion.get('BOOL'):
                                user_completed = user_completion['BOOL']
                            else:
                                user_completed = True
                        
                        if user_completed:
                            streak += 1
                        else:
                            # User didn't complete this problem, streak ends
                            break
                    else:
                        # No users data for this problem, streak ends
                        break
            
            return {
                "success": True,
                "data": {
                    "dailyComplete": daily_complete,
                    "streak": streak,
                    "todaysProblem": latest_problem
                }
            }
            
        except Exception as error:
            if DEBUG_MODE:
                print(f"[ERROR] Failed to get daily problem: {error}")
            raise error
    
    @staticmethod
    def get_user_daily_data(username: str) -> Dict:
        """Get just the user's streak data (lightweight operation)"""
        try:
            if not DAILY_TABLE:
                raise Exception("DAILY_TABLE not configured")
            
            from datetime import datetime, timezone, timedelta
            
            # Get recent problems for streak calculation (last 90 days to catch longer streaks)
            ninety_days_ago = (datetime.now() - timedelta(days=90)).strftime('%Y-%m-%d')
            scan_params = {
                'TableName': DAILY_TABLE,
                'FilterExpression': '#date >= :ninetyDaysAgo',
                'ExpressionAttributeNames': {'#date': 'date'},
                'ExpressionAttributeValues': {':ninetyDaysAgo': {'S': ninety_days_ago}}
            }
            
            raw_recent_problems = ddb.scan(**scan_params).get('Items', [])
            # Normalize the DynamoDB items for consistent access
            recent_problems = [normalize_dynamodb_item(item) for item in raw_recent_problems]
            
            # Calculate streak - count consecutive completed problems from database entries
            streak = 0
            normalized_username = username.lower()
            
            # Sort problems by date (newest first) and count consecutive completions
            sorted_problems = sorted(recent_problems, key=lambda x: x.get('date', ''), reverse=True)
            
            for problem in sorted_problems:
                problem_date = problem.get('date')
                if problem_date and 'users' in problem:
                    # Check if user completed this problem
                    if normalized_username in problem.get('users', {}):
                        streak += 1
                    else:
                        # User didn't complete this problem, streak ends
                        break
                else:
                    # No users data for this problem, streak ends
                    break
            
            return {'streak': streak}
            
        except Exception as error:
            if DEBUG_MODE:
                print(f"[ERROR] Failed to get user daily data: {error}")
            return {'streak': 0}
    
    @staticmethod
    def complete_daily_problem(username: str) -> Dict:
        """Mark daily problem as completed for a user"""
        try:
            if not DAILY_TABLE or not USERS_TABLE:
                raise Exception("Tables not configured")
            
            from datetime import datetime, timezone
            
            today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
            normalized_username = username.lower()
            
            # Update daily problem
            update_daily_params = {
                'TableName': DAILY_TABLE,
                'Key': {'date': {'S': today}},
                'UpdateExpression': 'SET #users.#username = :completed',
                'ExpressionAttributeNames': {
                    '#users': 'users',
                    '#username': normalized_username
                },
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
                    ':xp': {'N': '200'}
                }
            }
            
            ddb.update_item(**update_user_params)
            
            if DEBUG_MODE:
                print(f"[DEBUG] User {normalized_username} completed daily problem")
            
            return {"success": True}
            
        except Exception as error:
            if DEBUG_MODE:
                print(f"[ERROR] Failed to complete daily problem: {error}")
            raise error
    
    @staticmethod
    def get_top_daily_problems() -> Dict:
        """Get top 2 most recent daily problems for caching"""
        try:
            if not DAILY_TABLE:
                raise Exception("DAILY_TABLE not configured")
            
            # Scan daily table to get all problems
            scan_params = {
                'TableName': DAILY_TABLE
            }
            
            scan_result = ddb.scan(**scan_params)
            all_problems = scan_result.get('Items', [])
            
            if all_problems:
                # Sort by date to get the most recent problems
                sorted_problems = sorted(all_problems, key=lambda x: x.get('date', {}).get('S', ''), reverse=True)
                
                # Get top 2 problems
                top_problems = sorted_problems[:2]
                
                # Normalize the data
                normalized_problems = []
                for item in top_problems:
                    normalized_item = normalize_dynamodb_item(item)
                    problem = {
                        'date': normalized_item.get('date'),
                        'titleSlug': normalized_item.get('slug'),
                        'title': normalized_item.get('title'),
                        'frontendId': normalized_item.get('frontendId'),
                        'topicTags': normalized_item.get('tags', []),
                        'difficulty': normalized_item.get('difficulty', 'Medium'),
                        'content': normalized_item.get('content', ''),
                        'users': normalized_item.get('users', {})
                    }
                    normalized_problems.append(problem)
                
                if DEBUG_MODE:
                    print(f"[DEBUG] Retrieved top {len(normalized_problems)} daily problems")
                
                return {"success": True, "data": normalized_problems}
            
            return {"success": True, "data": []}
            
        except Exception as error:
            if DEBUG_MODE:
                print(f"[ERROR] Failed to get top daily problems: {error}")
            raise error


class BountyOperations:
    """Bounty-related operations"""
    
    @staticmethod
    def get_user_bounties(username: str) -> Dict:
        """Get all non-expired bounties with user's progress"""
        try:
            if not BOUNTIES_TABLE:
                raise Exception("BOUNTIES_TABLE not configured")
            
            normalized_username = username.lower()
            current_time = int(time.time())
            
            # Get all bounties
            scan_params = {
                'TableName': BOUNTIES_TABLE
            }
            
            scan_result = ddb.scan(**scan_params)
            all_bounties = scan_result.get('Items', [])
            
            # Filter and enrich bounties with computed fields
            active_bounties = []
            for bounty in all_bounties:
                expiry_date = int(float(bounty.get('expirydate', {}).get('N', '0')))
                start_date = int(float(bounty.get('startdate', {}).get('N', '0')))
                count = int(float(bounty.get('count', {}).get('N', '0')))
                
                # Only include active bounties (started and not expired)
                if start_date <= current_time <= expiry_date:
                    # Get user's progress (0 if not found)
                    users_map = bounty.get('users', {})
                    
                    # Handle both raw DynamoDB format and normalized format
                    if 'M' in users_map:
                        # Raw DynamoDB Map format
                        inner_users = users_map['M']
                        user_record = inner_users.get(normalized_username, {})
                        user_progress = int(float(user_record.get('N', '0')))
                    else:
                        # Already normalized format
                        user_progress = int(float(users_map.get(normalized_username, 0)))
                    
                    
                    # Calculate progress percentage
                    progress_percent = min((user_progress / count) * 100, 100) if count > 0 else 0
                    
                    # Calculate time remaining
                    time_remaining = expiry_date - current_time
                    days_remaining = max(0, time_remaining // (24 * 60 * 60))
                    hours_remaining = max(0, (time_remaining % (24 * 60 * 60)) // (60 * 60))
                    
                    # Create enriched bounty object
                    bounty_with_progress = dict(bounty)
                    bounty_with_progress['userProgress'] = {'N': str(user_progress)}
                    bounty_with_progress['progressPercent'] = {'N': str(round(progress_percent, 1))}
                    bounty_with_progress['timeRemaining'] = {'N': str(time_remaining)}
                    bounty_with_progress['daysRemaining'] = {'N': str(days_remaining)}
                    bounty_with_progress['hoursRemaining'] = {'N': str(hours_remaining)}
                    bounty_with_progress['isActive'] = {'BOOL': True}
                    bounty_with_progress['isExpired'] = {'BOOL': False}
                    
                    active_bounties.append(bounty_with_progress)
            
            # Normalize DynamoDB data for bounties
            normalized_bounties = [normalize_dynamodb_item(bounty) for bounty in active_bounties]
            
            return {"success": True, "data": normalized_bounties}
            
        except Exception as error:
            if DEBUG_MODE:
                print(f"[ERROR] Failed to get bounties: {error}")
            return {"success": False, "error": str(error)}
    
    @staticmethod
    def get_all_bounties() -> Dict:
        """Get all bounties without user-specific data"""
        try:
            if not BOUNTIES_TABLE:
                raise Exception("BOUNTIES_TABLE not configured")
            
            scan_params = {'TableName': BOUNTIES_TABLE}
            scan_result = ddb.scan(**scan_params)
            all_bounties = scan_result.get('Items', [])
            
            # Normalize bounties
            normalized_bounties = [normalize_dynamodb_item(bounty) for bounty in all_bounties]
            
            return {"success": True, "data": normalized_bounties}
            
        except Exception as error:
            if DEBUG_MODE:
                print(f"[ERROR] Failed to get all bounties: {error}")
            return {"success": False, "error": str(error)}
    
    @staticmethod
    def get_bounty_by_id(bounty_id: str) -> Dict:
        """Get specific bounty by ID"""
        try:
            if not BOUNTIES_TABLE:
                raise Exception("BOUNTIES_TABLE not configured")
            
            response = ddb.get_item(
                TableName=BOUNTIES_TABLE,
                Key={'id': {'S': bounty_id}}
            )
            
            if 'Item' in response:
                bounty = normalize_dynamodb_item(response['Item'])
                return {"success": True, "data": bounty}
            
            return {"success": False, "error": "Bounty not found"}
            
        except Exception as error:
            if DEBUG_MODE:
                print(f"[ERROR] Failed to get bounty by ID: {error}")
            return {"success": False, "error": str(error)}
    
    @staticmethod
    def get_bounty_progress(bounty_id: str) -> Dict:
        """Get progress for all users on a specific bounty"""
        try:
            if not BOUNTIES_TABLE:
                raise Exception("BOUNTIES_TABLE not configured")
            
            response = ddb.get_item(
                TableName=BOUNTIES_TABLE,
                Key={'id': {'S': bounty_id}}
            )
            
            if 'Item' in response:
                bounty = normalize_dynamodb_item(response['Item'])
                users_progress = bounty.get('users', {})
                return {"success": True, "data": users_progress}
            
            return {"success": False, "error": "Bounty not found"}
            
        except Exception as error:
            if DEBUG_MODE:
                print(f"[ERROR] Failed to get bounty progress: {error}")
            return {"success": False, "error": str(error)}
    
    @staticmethod
    def update_bounty_progress(username: str, bounty_id: str, increment: int = 1) -> Dict:
        """Update user's progress on a bounty and check for completion"""
        try:
            if not BOUNTIES_TABLE:
                raise Exception("BOUNTIES_TABLE not configured")
            
            normalized_username = username.lower()
            
            # First get the current bounty to check completion requirements
            response = ddb.get_item(
                TableName=BOUNTIES_TABLE,
                Key={'id': {'S': bounty_id}}
            )
            
            if 'Item' not in response:
                return {"success": False, "error": "Bounty not found"}
            
            bounty = normalize_dynamodb_item(response['Item'])
            current_time = int(time.time())
            expiry_date = bounty.get('expirydate', 0)
            start_date = bounty.get('startdate', 0)
            required_count = bounty.get('count', 0)
            xp_reward = bounty.get('xp', 0)
            
            # Check if bounty is still active
            if not (start_date <= current_time <= expiry_date):
                return {"success": False, "error": "Bounty is not active"}
            
            # Get current user progress
            users_progress = bounty.get('users', {})
            current_progress = users_progress.get(normalized_username, 0)
            
            # Check if user already completed this bounty
            if current_progress >= required_count:
                return {"success": False, "error": "User has already completed this bounty"}
            
            # Calculate new progress
            new_progress = min(current_progress + increment, required_count)
            
            # Update bounty progress in DynamoDB
            update_params = {
                'TableName': BOUNTIES_TABLE,
                'Key': {'id': {'S': bounty_id}},
                'UpdateExpression': 'SET users.#username = :progress',
                'ExpressionAttributeNames': {'#username': normalized_username},
                'ExpressionAttributeValues': {':progress': {'N': str(new_progress)}}
            }
            
            ddb.update_item(**update_params)
            
            # Check if user just completed the bounty
            just_completed = (current_progress < required_count and new_progress >= required_count)
            
            if just_completed and xp_reward > 0:
                # Award XP for bounty completion
                UserOperations.award_xp(normalized_username, xp_reward)
                if DEBUG_MODE:
                    print(f"[DEBUG] User {normalized_username} completed bounty {bounty_id}, awarded {xp_reward} XP")
                
                return {
                    "success": True, 
                    "progress": new_progress,
                    "completed": True,
                    "xp_awarded": xp_reward,
                    "message": f"Bounty completed! Awarded {xp_reward} XP"
                }
            
            return {
                "success": True, 
                "progress": new_progress,
                "completed": False,
                "progress_percent": (new_progress / required_count * 100) if required_count > 0 else 0
            }
            
        except Exception as error:
            if DEBUG_MODE:
                print(f"[ERROR] Failed to update bounty progress: {error}")
            return {"success": False, "error": str(error)}
    

class DuelOperations:
    """Duel-related operations"""
    
    @staticmethod
    def get_user_duels(username: str) -> Dict:
        """Get duels for a user"""
        try:
            if not DUELS_TABLE:
                raise Exception("DUELS_TABLE not configured")
            
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
                duels = [normalize_dynamodb_item(duel) for duel in raw_duels]
                    
            except Exception as scan_error:
                if DEBUG_MODE:
                    print(f"[ERROR] Duel scan failed: {scan_error}")
                duels = []
            
            return {"success": True, "data": duels}
            
        except Exception as error:
            if DEBUG_MODE:
                print(f"[ERROR] Failed to get duels: {error}")
            raise error
    
    @staticmethod
    def create_duel(username: str, opponent: str, problem_slug: str, problem_title: str = None, problem_number: str = None, difficulty: str = None) -> Dict:
        """Create a new duel"""
        try:
            if not DUELS_TABLE:
                raise Exception("DUELS_TABLE not configured")
            
            import uuid
            
            duel_id = str(uuid.uuid4())
            normalized_username = username.lower()
            normalized_opponent = opponent.lower()
            
            # Create duel record
            put_params = {
                'TableName': DUELS_TABLE,
                'Item': {
                    'duelId': {'S': duel_id},
                    'challenger': {'S': normalized_username},
                    'challengee': {'S': normalized_opponent},
                    'problemSlug': {'S': problem_slug},
                    'status': {'S': 'PENDING'},
                    'createdAt': {'S': datetime.now(timezone.utc).isoformat()},
                    'expires_at': {'N': str(int(time.time()) + 3600)},  # 1 hour
                    'challengerTime': {'N': '-1'},  # -1 means not started
                    'challengeeTime': {'N': '-1'}   # -1 means not started
                }
            }
            
            # Add optional fields if provided
            if difficulty:
                put_params['Item']['difficulty'] = {'S': difficulty}
            if problem_title:
                put_params['Item']['problemTitle'] = {'S': problem_title}
            if problem_number:
                put_params['Item']['problemNumber'] = {'S': problem_number}
            
            ddb.put_item(**put_params)
            
            duel_action(f"Created duel {duel_id}", challenger=normalized_username, challengee=normalized_opponent, problem=problem_slug)
            
            return {"success": True, "data": {"duel_id": duel_id}}
            
        except Exception as error:
            if DEBUG_MODE:
                print(f"[ERROR] Failed to create duel: {error}")
            raise error
    
    @staticmethod
    def accept_duel(username: str, duel_id: str) -> Dict:
        """Accept a duel - marks as ACCEPTED, not yet started"""
        try:
            if not DUELS_TABLE:
                raise Exception("DUELS_TABLE not configured")
            
            # Update duel status to ACCEPTED (not ACTIVE yet)
            update_params = {
                'TableName': DUELS_TABLE,
                'Key': {'duelId': {'S': duel_id}},
                'UpdateExpression': 'SET #status = :status, acceptedAt = :acceptedAt',
                'ExpressionAttributeNames': {'#status': 'status'},
                'ExpressionAttributeValues': {
                    ':status': {'S': 'ACCEPTED'},
                    ':acceptedAt': {'S': datetime.now(timezone.utc).isoformat()}
                }
            }
            
            ddb.update_item(**update_params)
            
            duel_action(f"User {username} accepted duel {duel_id}")
            
            return {"success": True}
            
        except Exception as error:
            if DEBUG_MODE:
                print(f"[ERROR] Failed to accept duel: {error}")
            raise error
    
    @staticmethod
    def start_duel(username: str, duel_id: str) -> Dict:
        """Mark that a user has started working on a duel (set their time to 0)"""
        try:
            if not DUELS_TABLE:
                raise Exception("DUELS_TABLE not configured")
            
            normalized_username = username.lower()
            
            # First get the duel to determine if user is challenger or challengee
            get_params = {
                'TableName': DUELS_TABLE,
                'Key': {'duelId': {'S': duel_id}}
            }
            
            response = ddb.get_item(**get_params)
            if 'Item' not in response:
                raise Exception("Duel not found")
            
            duel = response['Item']
            challenger = duel.get('challenger', {}).get('S')
            challengee = duel.get('challengee', {}).get('S')
            
            # Determine which time field to update and which start time field to set
            current_time = datetime.now(timezone.utc).isoformat()
            if normalized_username == challenger:
                time_field = 'challengerTime'
                start_time_field = 'challengerStartTime'
            elif normalized_username == challengee:
                time_field = 'challengeeTime'
                start_time_field = 'challengeeStartTime'
            else:
                raise Exception("User is not part of this duel")
            
            # Update the user's time to 0, set their individual start time, and set status to ACTIVE
            update_params = {
                'TableName': DUELS_TABLE,
                'Key': {'duelId': {'S': duel_id}},
                'UpdateExpression': f'SET {time_field} = :time, {start_time_field} = :userStartTime, #status = :status, startTime = if_not_exists(startTime, :startTime)',
                'ExpressionAttributeNames': {'#status': 'status'},
                'ExpressionAttributeValues': {
                    ':time': {'N': '0'},
                    ':userStartTime': {'S': current_time},
                    ':status': {'S': 'ACTIVE'},
                    ':startTime': {'S': current_time}
                }
            }
            
            ddb.update_item(**update_params)
            
            duel_action(f"User {username} started duel {duel_id}")
            
            return {"success": True, "message": f"Duel started for {username}"}
            
        except Exception as error:
            if DEBUG_MODE:
                print(f"[ERROR] Failed to start duel: {error}")
            raise error
    
    @staticmethod
    def reject_duel(duel_id: str) -> Dict:
        """Reject a duel"""
        try:
            if not DUELS_TABLE:
                raise Exception("DUELS_TABLE not configured")
            
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
            raise error
    
    @staticmethod
    def calculate_duel_xp(difficulty: str, is_winner: bool) -> int:
        """Calculate BONUS XP for winning duels
        UI advertises:
        - Easy: 100 XP + 200 bonus if you win
        - Medium: 300 XP + 200 bonus if you win  
        - Hard: 500 XP + 200 bonus if you win
        
        Base XP is awarded automatically by daily problem system.
        This function only returns the WIN BONUS.
        """
        if not is_winner:
            return 0  # Losers get no bonus XP
        
        # All difficulties get +200 bonus for winning
        return 200
    
    @staticmethod
    def record_duel_submission(username: str, duel_id: str, elapsed_ms: int) -> Dict:
        """Record a duel submission with elapsed time"""
        try:
            if not DUELS_TABLE or not USERS_TABLE:
                raise Exception("Tables not configured")
            
            normalized_username = username.lower()
            
            # Get current duel details
            get_params = {
                'TableName': DUELS_TABLE,
                'Key': {'duelId': {'S': duel_id}}
            }
            
            get_result = ddb.get_item(**get_params)
            if 'Item' not in get_result:
                return {"success": False, "error": "Duel not found"}
            
            duel_item = get_result['Item']
            challenger = duel_item.get('challenger', {}).get('S')
            challengee = duel_item.get('challengee', {}).get('S')
            current_status = duel_item.get('status', {}).get('S')
            difficulty = duel_item.get('difficulty', {}).get('S', 'Medium')  # Default to Medium if not set
            
            # Don't allow submissions on already completed duels
            if current_status == 'COMPLETED':
                return {"success": False, "error": "Duel already completed"}
            
            # Determine if user is challenger or challengee
            is_challenger = normalized_username == challenger
            if not is_challenger and normalized_username != challengee:
                return {"success": False, "error": "User not part of this duel"}
            
            # Get existing times
            current_challenger_time = duel_item.get('challengerTime', {}).get('N')
            current_challengee_time = duel_item.get('challengeeTime', {}).get('N')
            
            # Don't overwrite if user already has a time recorded
            if is_challenger and current_challenger_time and current_challenger_time != '0':
                return {"success": False, "error": "Challenger time already recorded"}
            if not is_challenger and current_challengee_time and current_challengee_time != '0':
                return {"success": False, "error": "Challengee time already recorded"}
            
            # Note: elapsed_ms passed from frontend is not reliable, we'll calculate it ourselves
            # Get the user's individual start time
            challenger_start = duel_item.get('challengerStartTime', {}).get('S')
            challengee_start = duel_item.get('challengeeStartTime', {}).get('S')
            
            # Calculate actual elapsed time based on individual start times
            current_timestamp = datetime.now(timezone.utc)
            if is_challenger and challenger_start:
                user_start_time = datetime.fromisoformat(challenger_start.replace('Z', '+00:00'))
                actual_elapsed_ms = int((current_timestamp - user_start_time).total_seconds() * 1000)
            elif not is_challenger and challengee_start:
                user_start_time = datetime.fromisoformat(challengee_start.replace('Z', '+00:00'))
                actual_elapsed_ms = int((current_timestamp - user_start_time).total_seconds() * 1000)
            else:
                # Fallback to provided elapsed_ms if no start time found
                actual_elapsed_ms = elapsed_ms
                if DEBUG_MODE:
                    print(f"[DEBUG] No individual start time found for {normalized_username}, using provided elapsed: {elapsed_ms}ms")
            
            # Update the appropriate user's time
            if is_challenger:
                update_expression = 'SET challengerTime = :time'
                expression_values = {':time': {'N': str(actual_elapsed_ms)}}
                new_challenger_time = actual_elapsed_ms
                # Only consider positive times as valid completions (0 means started but not finished)
                new_challengee_time = int(current_challengee_time) if current_challengee_time and int(current_challengee_time) > 0 else None
            else:
                update_expression = 'SET challengeeTime = :time'
                expression_values = {':time': {'N': str(actual_elapsed_ms)}}
                # Only consider positive times as valid completions (0 means started but not finished)
                new_challenger_time = int(current_challenger_time) if current_challenger_time and int(current_challenger_time) > 0 else None
                new_challengee_time = actual_elapsed_ms
            
            # Update the time
            update_params = {
                'TableName': DUELS_TABLE,
                'Key': {'duelId': {'S': duel_id}},
                'UpdateExpression': update_expression,
                'ExpressionAttributeValues': expression_values
            }
            
            ddb.update_item(**update_params)
            
            # Check if we should complete the duel (both users have times or one user completed and timeout passed)
            should_complete_duel = False
            winner = None
            xp_award = 0  # Only winner gets XP
            
            if new_challenger_time is not None and new_challengee_time is not None:
                # Both users completed - determine winner
                should_complete_duel = True
                if new_challenger_time < new_challengee_time:
                    winner = challenger
                    xp_award = DuelOperations.calculate_duel_xp(difficulty, True)
                elif new_challengee_time < new_challenger_time:
                    winner = challengee
                    xp_award = DuelOperations.calculate_duel_xp(difficulty, True)
                else:
                    # Tie - both get winner XP
                    winner = None  # No single winner
                    xp_award = DuelOperations.calculate_duel_xp(difficulty, True)  # Both get winner XP in case of tie
                    
            elif (new_challenger_time is not None or new_challengee_time is not None):
                # Only one user completed - check if enough time has passed for timeout
                # For now, don't auto-complete. Let background job handle timeouts
                should_complete_duel = False
            
            if should_complete_duel:
                # Complete the duel
                complete_params = {
                    'TableName': DUELS_TABLE,
                    'Key': {'duelId': {'S': duel_id}},
                    'UpdateExpression': 'SET #status = :status, winner = :winner, xpAwarded = :xp, completedAt = :completed',
                    'ExpressionAttributeNames': {'#status': 'status'},
                    'ExpressionAttributeValues': {
                        ':status': {'S': 'COMPLETED'},
                        ':winner': {'S': winner} if winner else {'NULL': True},
                        ':xp': {'N': str(xp_award)},
                        ':completed': {'S': datetime.now(timezone.utc).isoformat()}
                    }
                }
                
                ddb.update_item(**complete_params)
                
                # Award XP to participants
                if winner:
                    UserOperations.award_xp(winner, xp_award)
                    # Award participation XP to loser
                    loser = challengee if winner == challenger else challenger
                    UserOperations.award_xp(loser, 25)
                else:
                    # Tie - both get winner XP
                    UserOperations.award_xp(challenger, xp_award)
                    UserOperations.award_xp(challengee, xp_award)
                
                duel_action(f"Duel {duel_id} completed", winner=winner or 'TIE')
            
            duel_action(f"User {normalized_username} recorded time", duel_id=duel_id, time_ms=elapsed_ms)
            
            return {
                "success": True, 
                "completed": should_complete_duel, 
                "winner": winner if should_complete_duel else None,
                "xpAwarded": xp_award if should_complete_duel else None
            }
            
        except Exception as error:
            if DEBUG_MODE:
                print(f"[ERROR] Failed to record duel submission: {error}")
            raise error
    
    @staticmethod
    def get_duel_by_id(duel_id: str) -> Dict:
        """Get a specific duel by ID"""
        try:
            if not DUELS_TABLE:
                raise Exception("DUELS_TABLE not configured")
            
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
                'problemNumber': duel_item.get('problemNumber', {}).get('S'),
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
            raise error
    
    @staticmethod
    def cleanup_expired_duels() -> Dict:
        """Clean up expired duels"""
        try:
            if not DUELS_TABLE:
                raise Exception("DUELS_TABLE not configured")
            
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
                        'Key': {'duelId': duel['duelId']},
                    }
                    ddb.delete_item(**delete_params)
                    
                    if DEBUG_MODE:
                        print(f"[DEBUG] Deleted expired duel: {duel['duelId']['S']} (status: {duel['status']['S']})")
                
                if DEBUG_MODE:
                    print(f"[DEBUG] Cleaned up {len(expired_duels)} expired duels")
            
            return {"success": True, "count": len(expired_duels)}
            
        except Exception as error:
            if DEBUG_MODE:
                print(f"[ERROR] Failed to cleanup expired duels: {error}")
            raise error
    
    @staticmethod
    async def handle_duel_timeouts() -> Dict:
        """Handle duel timeouts - complete duels where only one person solved and timeout period passed"""
        try:
            if not DUELS_TABLE:
                raise Exception("DUELS_TABLE not configured")
            
            # Get all active duels
            scan_params = {
                'TableName': DUELS_TABLE,
                'FilterExpression': '#status = :active',
                'ExpressionAttributeNames': {'#status': 'status'},
                'ExpressionAttributeValues': {':active': {'S': 'ACTIVE'}}
            }
            
            scan_result = ddb.scan(**scan_params)
            active_duels = scan_result.get('Items', [])
            
            now = int(time.time())
            timeout_threshold = 30 * 60  # 30 minutes after one person solves
            completed_duels = 0
            
            for duel_item in active_duels:
                duel_id = duel_item.get('duelId', {}).get('S')
                challenger = duel_item.get('challenger', {}).get('S')
                challengee = duel_item.get('challengee', {}).get('S')
                difficulty = duel_item.get('difficulty', {}).get('S', 'Medium')  # Default to Medium if not set
                start_time_str = duel_item.get('startTime', {}).get('S')
                
                challenger_time = duel_item.get('challengerTime', {}).get('N')
                challengee_time = duel_item.get('challengeeTime', {}).get('N')
                
                # Skip if both already have times (should have been completed already)
                if challenger_time and challenger_time != '0' and challengee_time and challengee_time != '0':
                    continue
                
                # Check if only one person has completed
                challenger_completed = challenger_time and challenger_time != '0'
                challengee_completed = challengee_time and challengee_time != '0'
                
                if challenger_completed or challengee_completed:
                    # Someone completed - check if enough time has passed for timeout
                    if start_time_str:
                        start_time = datetime.fromisoformat(start_time_str.replace('Z', '+00:00'))
                        time_since_start = now - start_time.timestamp()
                        
                        if time_since_start > timeout_threshold:
                            # Complete duel due to timeout
                            winner = challenger if challenger_completed else challengee
                            loser = challengee if challenger_completed else challenger
                            duel_action(f"Completing duel {duel_id} due to timeout", winner=winner, loser=loser)
                            
                            # Calculate proper bonus XP
                            bonus_xp = DuelOperations.calculate_duel_xp(difficulty, True)  # Winner gets bonus
                            
                            complete_params = {
                                'TableName': DUELS_TABLE,
                                'Key': {'duelId': {'S': duel_id}},
                                'UpdateExpression': 'SET #status = :status, winner = :winner, xpAwarded = :xp, completedAt = :completed, completionReason = :reason',
                                'ExpressionAttributeNames': {'#status': 'status'},
                                'ExpressionAttributeValues': {
                                    ':status': {'S': 'COMPLETED'},
                                    ':winner': {'S': winner},
                                    ':xp': {'N': str(bonus_xp)},
                                    ':completed': {'S': datetime.now(timezone.utc).isoformat()},
                                    ':reason': {'S': 'TIMEOUT'}
                                }
                            }
                            
                            ddb.update_item(**complete_params)
                            
                            # Award only bonus XP to winner (base XP comes from daily problem system)
                            UserOperations.award_xp(winner, bonus_xp)  # Winner gets +200 bonus
                            
                            completed_duels += 1
                            if DEBUG_MODE:
                                print(f"[DEBUG] Completed duel {duel_id} due to timeout. Winner: {winner}")
                
                # Also handle cases where no one solved and total duel time exceeded (2 hours)
                elif start_time_str:
                    start_time = datetime.fromisoformat(start_time_str.replace('Z', '+00:00'))
                    time_since_start = now - start_time.timestamp()
                    max_duel_time = 2 * 60 * 60  # 2 hours max
                    
                    if time_since_start > max_duel_time:
                        # End duel with no winner
                        complete_params = {
                            'TableName': DUELS_TABLE,
                            'Key': {'duelId': {'S': duel_id}},
                            'UpdateExpression': 'SET #status = :status, completedAt = :completed, completionReason = :reason',
                            'ExpressionAttributeNames': {'#status': 'status'},
                            'ExpressionAttributeValues': {
                                ':status': {'S': 'COMPLETED'},
                                ':completed': {'S': datetime.now(timezone.utc).isoformat()},
                                ':reason': {'S': 'EXPIRED'}
                            }
                        }
                        
                        ddb.update_item(**complete_params)
                        completed_duels += 1
                        if DEBUG_MODE:
                            print(f"[DEBUG] Expired duel {duel_id} - no winner")
            
            return {"success": True, "completed_duels": completed_duels}
            
        except Exception as error:
            if DEBUG_MODE:
                print(f"[ERROR] Failed to handle duel timeouts: {error}")
            return {"success": False, "error": str(error)}