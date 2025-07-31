"""
AWS DynamoDB operations for YeetCode
"""

import os
import time
import boto3
from datetime import datetime
from typing import Dict, Optional, List, Any
from botocore.exceptions import ClientError

# Initialize DynamoDB
dynamodb = boto3.resource('dynamodb')
ddb = boto3.client('dynamodb')

# DynamoDB Table Names
USERS_TABLE = os.getenv("USERS_TABLE")
DAILY_TABLE = os.getenv("DAILY_TABLE")
DUELS_TABLE = os.getenv("DUELS_TABLE")
BOUNTIES_TABLE = os.getenv("BOUNTIES_TABLE")

DEBUG_MODE = os.getenv("DEBUG_MODE", "false").lower() == "true"


def normalize_dynamodb_item(item: Dict) -> Dict:
    """Normalize DynamoDB data structure to regular Python dict"""
    normalized = {}
    for key, value in item.items():
        if isinstance(value, dict):
            if 'S' in value:
                normalized[key] = value['S']
            elif 'N' in value:
                normalized[key] = int(value['N'])
            elif 'BOOL' in value:
                normalized[key] = value['BOOL']
            elif 'M' in value:
                normalized[key] = normalize_dynamodb_item(value['M'])
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
    def create_user(email: str) -> Dict:
        """Create new user"""
        try:
            if not USERS_TABLE:
                raise Exception("USERS_TABLE not configured")
            
            user_params = {
                'TableName': USERS_TABLE,
                'Item': {
                    'username': {'S': email.lower()},
                    'email': {'S': email.lower()},
                    'created_at': {'S': datetime.now().isoformat()}
                }
            }
            ddb.put_item(**user_params)
            return UserOperations.get_user_data(email.lower())
        except Exception as error:
            if DEBUG_MODE:
                print(f"[ERROR] Failed to create user: {error}")
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


class VerificationOperations:
    """Verification code operations"""
    
    @staticmethod
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
                
            # Get or create user data
            user_data = UserOperations.get_user_data(email.lower())
            if not user_data:
                user_data = UserOperations.create_user(email)
                
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
        """Get daily problem data for a user"""
        try:
            if not DAILY_TABLE:
                raise Exception("DAILY_TABLE not configured")
            
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
            raise error
    
    @staticmethod
    def complete_daily_problem(username: str) -> Dict:
        """Mark daily problem as completed for a user"""
        try:
            if not DAILY_TABLE or not USERS_TABLE:
                raise Exception("Tables not configured")
            
            from datetime import datetime
            
            today = datetime.now().strftime('%Y-%m-%d')
            normalized_username = username.lower()
            
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
            raise error


class BountyOperations:
    """Bounty-related operations"""
    
    @staticmethod
    def get_user_bounties(username: str) -> Dict:
        """Get bounties for a user"""
        try:
            if not BOUNTIES_TABLE:
                raise Exception("BOUNTIES_TABLE not configured")
            
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
            raise error
    
    @staticmethod
    def complete_bounty(username: str, bounty_id: str) -> Dict:
        """Complete a bounty for a user"""
        try:
            if not BOUNTIES_TABLE or not USERS_TABLE:
                raise Exception("Tables not configured")
            
            normalized_username = username.lower()
            
            # Update bounty completion
            update_bounty_params = {
                'TableName': BOUNTIES_TABLE,
                'Key': {'bounty_id': {'S': bounty_id}},
                'UpdateExpression': 'SET completed = :completed, completed_at = :completed_at',
                'ExpressionAttributeValues': {
                    ':completed': {'BOOL': True},
                    ':completed_at': {'S': datetime.now().isoformat()}
                }
            }
            
            ddb.update_item(**update_bounty_params)
            
            # Award XP
            UserOperations.award_xp(normalized_username, 50)
            
            if DEBUG_MODE:
                print(f"[DEBUG] User {normalized_username} completed bounty {bounty_id}")
            
            return {"success": True}
            
        except Exception as error:
            if DEBUG_MODE:
                print(f"[ERROR] Failed to complete bounty: {error}")
            raise error
    
    @staticmethod
    def update_bounty_progress(username: str, bounty_id: str, progress: int) -> Dict:
        """Update bounty progress for a user"""
        try:
            if not BOUNTIES_TABLE or not USERS_TABLE:
                raise Exception("Tables not configured")
            
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
            xp_awarded = 0
            if was_complete:
                xp_amount = int(bounty_data.get('xp', {}).get('N', '50'))
                UserOperations.award_xp(normalized_username, xp_amount)
                xp_awarded = xp_amount
            
            return {
                "success": True,
                "progress": progress,
                "completed": was_complete,
                "justCompleted": was_complete,
                "xpAwarded": xp_awarded
            }
            
        except Exception as error:
            if DEBUG_MODE:
                print(f"[ERROR] Failed to update bounty progress: {error}")
            raise error


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
    def create_duel(username: str, opponent: str, problem_slug: str) -> Dict:
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
            raise error
    
    @staticmethod
    def accept_duel(username: str, duel_id: str) -> Dict:
        """Accept a duel"""
        try:
            if not DUELS_TABLE:
                raise Exception("DUELS_TABLE not configured")
            
            # Update duel status
            update_params = {
                'TableName': DUELS_TABLE,
                'Key': {'duelId': {'S': duel_id}},
                'UpdateExpression': 'SET #status = :status, startTime = :startTime',
                'ExpressionAttributeNames': {'#status': 'status'},
                'ExpressionAttributeValues': {
                    ':status': {'S': 'ACTIVE'},
                    ':startTime': {'S': datetime.now().isoformat()}
                }
            }
            
            ddb.update_item(**update_params)
            
            if DEBUG_MODE:
                print(f"[DEBUG] User {username} accepted duel {duel_id}")
            
            return {"success": True}
            
        except Exception as error:
            if DEBUG_MODE:
                print(f"[ERROR] Failed to accept duel: {error}")
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
    def record_duel_submission(username: str, duel_id: str, elapsed_ms: int) -> Dict:
        """Record a duel submission with elapsed time"""
        try:
            if not DUELS_TABLE or not USERS_TABLE:
                raise Exception("Tables not configured")
            
            normalized_username = username.lower()
            
            # Get duel details
            get_params = {
                'TableName': DUELS_TABLE,
                'Key': {'duelId': {'S': duel_id}}
            }
            
            get_result = ddb.get_item(**get_params)
            if 'Item' not in get_result:
                return {"success": False, "error": "Duel not found"}
            
            # Update duel with submission
            update_params = {
                'TableName': DUELS_TABLE,
                'Key': {'duelId': {'S': duel_id}},
                'UpdateExpression': 'SET challengerTime = :challengerTime, challengeeTime = :challengeeTime, #status = :status, winner = :winner, xpAwarded = :xpAwarded',
                'ExpressionAttributeNames': {'#status': 'status'},
                'ExpressionAttributeValues': {
                    ':challengerTime': {'N': str(elapsed_ms)},
                    ':challengeeTime': {'N': '0'},
                    ':status': {'S': 'COMPLETED'},
                    ':winner': {'S': normalized_username},
                    ':xpAwarded': {'N': '300'}
                }
            }
            
            ddb.update_item(**update_params)
            
            # Award XP
            UserOperations.award_xp(normalized_username, 25)
            
            if DEBUG_MODE:
                print(f"[DEBUG] User {normalized_username} completed duel {duel_id} in {elapsed_ms}ms")
            
            return {"success": True}
            
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
                        'Key': {'duel_id': duel['duel_id']},
                    }
                    ddb.delete_item(**delete_params)
                    
                    if DEBUG_MODE:
                        print(f"[DEBUG] Deleted expired duel: {duel['duel_id']['S']} (status: {duel['status']['S']})")
                
                if DEBUG_MODE:
                    print(f"[DEBUG] Cleaned up {len(expired_duels)} expired duels")
            
            return {"success": True, "count": len(expired_duels)}
            
        except Exception as error:
            if DEBUG_MODE:
                print(f"[ERROR] Failed to cleanup expired duels: {error}")
            raise error