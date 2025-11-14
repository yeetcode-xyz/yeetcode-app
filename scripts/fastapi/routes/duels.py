# Deployment timestamp: 2024-12-19 00:00:00 UTC
"""
Duel routes
"""

import random
import httpx
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from models import DuelRequest
from auth import verify_api_key
from aws import DuelOperations, DuelInviteLinkOperations, UserOperations
from cache_manager import cache_manager, CacheType

router = APIRouter(tags=["Duels"])

DEBUG_MODE = True


@router.get("/duels/{username}")
async def get_user_duels_endpoint(
    username: str,
    api_key: str = Depends(verify_api_key)
):
    """Get duels for a user and automatically clean up expired duels"""
    try:
        # First, clean up any expired duels automatically
        cleanup_result = DuelOperations.cleanup_expired_duels()
        if cleanup_result.get('count', 0) > 0:
            print(f"[DEBUG] Cleaned up {cleanup_result.get('count', 0)} expired duels during get_user_duels")
        
        # Check cache first for duels
        cached_duels = cache_manager.get(CacheType.DUELS)
        if cached_duels:
            # Filter duels for this user
            user_duels = []
            for duel in cached_duels.get('data', []):
                if (duel.get('username') == username or 
                    duel.get('opponent') == username):
                    user_duels.append(duel)
            
            return {
                "success": True,
                "data": user_duels
            }
        
        # Fallback to database
        result = DuelOperations.get_user_duels(username)
        return result
    except Exception as error:
        return {"success": False, "error": str(error)}


@router.post("/create-duel")
async def create_duel_endpoint(
    request: DuelRequest,
    api_key: str = Depends(verify_api_key)
):
    """Create a new duel"""
    try:
        if DEBUG_MODE:
            wager_info = f", is_wager: {request.is_wager}, wager_amount: {request.wager_amount}" if request.is_wager else ""
            print(f"[DEBUG] Creating duel - username: {request.username}, opponent: {request.opponent}, problem_slug: {request.problem_slug}, problem_title: {request.problem_title}, problem_number: {request.problem_number}, difficulty: {request.difficulty}{wager_info}")

        result = DuelOperations.create_duel(
            request.username,
            request.opponent,
            request.problem_slug,
            request.problem_title,
            request.problem_number,
            request.difficulty,
            request.is_wager or False,
            request.wager_amount
        )

        # Invalidate cache to force refresh
        cache_manager.invalidate_all(CacheType.DUELS)

        return result
    except Exception as error:
        return {"success": False, "error": str(error)}


@router.post("/accept-duel")
async def accept_duel_endpoint(
    request: DuelRequest,
    api_key: str = Depends(verify_api_key)
):
    """Accept a duel. For wager duels, opponent must specify their wager amount."""
    try:
        result = DuelOperations.accept_duel(
            request.username,
            request.duel_id,
            request.wager_amount  # Opponent's wager for wager duels
        )

        # Invalidate cache to force refresh
        cache_manager.invalidate_all(CacheType.DUELS)

        return result
    except Exception as error:
        return {"success": False, "error": str(error)}


@router.post("/start-duel")
async def start_duel_endpoint(
    request: DuelRequest,
    api_key: str = Depends(verify_api_key)
):
    """Mark that a user has started working on a duel"""
    try:
        result = DuelOperations.start_duel(request.username, request.duel_id)
        
        # Invalidate cache to force refresh
        cache_manager.invalidate_all(CacheType.DUELS)
        
        return result
    except Exception as error:
        return {"success": False, "error": str(error)}


@router.post("/complete-duel")
async def complete_duel_endpoint(
    request: DuelRequest,
    api_key: str = Depends(verify_api_key)
):
    """Complete a duel submission"""
    try:
        # Legacy endpoint - redirects to record submission
        result = DuelOperations.record_duel_submission(request.username, request.duel_id, 0)
        
        # Invalidate cache to force refresh
        cache_manager.invalidate_all(CacheType.DUELS)
        
        return result
    except Exception as error:
        return {"success": False, "error": str(error)}


@router.post("/reject-duel")
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
        
        # Invalidate cache to force refresh
        cache_manager.invalidate_all(CacheType.DUELS)
        
        return result
    except Exception as error:
        return {"success": False, "error": str(error)}


@router.post("/record-duel-submission")
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
        
        # Invalidate cache to force refresh
        cache_manager.invalidate_all(CacheType.DUELS)
        
        return result
    except Exception as error:
        return {"success": False, "error": str(error)}


@router.get("/duel/{duel_id}")
async def get_duel_endpoint(
    duel_id: str,
    api_key: str = Depends(verify_api_key)
):
    """Get a specific duel by ID"""
    try:
        # Check cache first for duels
        cached_duels = cache_manager.get(CacheType.DUELS)
        if cached_duels:
            for duel in cached_duels.get('data', []):
                if duel.get('id') == duel_id:
                    return {"success": True, "data": duel}
        
        # Fallback to database
        result = DuelOperations.get_duel_by_id(duel_id)
        return result
    except Exception as error:
        return {"success": False, "error": str(error)}


class GenerateDuelLinkRequest(BaseModel):
    challenger_username: str
    difficulty: str
    is_wager: bool = False
    wager_amount: int = None


@router.post("/generate-duel-link")
async def generate_duel_link_endpoint(
    request: GenerateDuelLinkRequest,
    api_key: str = Depends(verify_api_key)
):
    """Generate a shareable duel invite link"""
    try:
        result = DuelInviteLinkOperations.generate_duel_link(
            challenger_username=request.challenger_username,
            difficulty=request.difficulty,
            is_wager=request.is_wager,
            wager_amount=request.wager_amount
        )
        return result
    except Exception as error:
        if DEBUG_MODE:
            print(f"[ERROR] Failed to generate duel link: {error}")
        return {"success": False, "error": str(error)}


@router.get("/duel-link/{token}")
async def get_duel_link_endpoint(
    token: str
):
    """Get duel invite link information by token (public endpoint - no auth required)"""
    try:
        link_info = DuelInviteLinkOperations.get_duel_link_info(token)
        if link_info:
            return {"success": True, "data": link_info}
        else:
            return {"success": False, "error": "Invite link not found or expired"}
    except Exception as error:
        if DEBUG_MODE:
            print(f"[ERROR] Failed to get duel link: {error}")
        return {"success": False, "error": str(error)}


class AcceptDuelLinkRequest(BaseModel):
    token: str
    accepting_username: str
    opponent_wager: int = None  # For wager duels


@router.post("/accept-duel-link")
async def accept_duel_link_endpoint(
    request: AcceptDuelLinkRequest,
    api_key: str = Depends(verify_api_key)
):
    """Accept a duel invite link - creates a duel between challenger and accepting user"""
    try:
        # Get link info
        link_info = DuelInviteLinkOperations.get_duel_link_info(request.token)
        if not link_info:
            return {"success": False, "error": "Invite link not found or expired"}
        
        challenger_username = link_info.get("challenger_username")
        difficulty = link_info.get("difficulty")
        is_wager = link_info.get("is_wager", False)
        challenger_wager = link_info.get("wager_amount", 0)
        accepting_username = request.accepting_username.lower()
        
        # Don't allow self-challenge
        if challenger_username == accepting_username:
            return {"success": False, "error": "You cannot challenge yourself"}
        
        # Fetch random problem for the difficulty
        difficulty_map = {
            "Easy": "EASY",
            "Medium": "MEDIUM", 
            "Hard": "HARD",
            "Random": ["EASY", "MEDIUM", "HARD"][random.randint(0, 2)]
        }
        leetcode_difficulty = difficulty_map.get(difficulty, difficulty.upper())
        
        # Fetch problems from LeetCode
        PROBLEM_LIST_QUERY = """
            query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
                problemsetQuestionList: questionList(
                    categorySlug: $categorySlug
                    limit: $limit
                    skip: $skip
                    filters: $filters
                ) {
                    questions: data {
                        title
                        titleSlug
                        difficulty
                        frontendQuestionId: questionFrontendId
                        paidOnly: isPaidOnly
                    }
                }
            }
        """
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                "https://leetcode.com/graphql",
                json={
                    "query": PROBLEM_LIST_QUERY,
                    "variables": {
                        "categorySlug": "",
                        "limit": 1000,
                        "skip": 0,
                        "filters": {"difficulty": leetcode_difficulty}
                    }
                },
                headers={
                    "Content-Type": "application/json",
                    "User-Agent": "YeetCode/1.0"
                }
            )
            
            if response.status_code != 200:
                return {"success": False, "error": "Failed to fetch problem from LeetCode"}
            
            data = response.json()
            problems = data.get("data", {}).get("problemsetQuestionList", {}).get("questions", [])
            free_problems = [p for p in problems if not p.get("paidOnly")]
            
            if not free_problems:
                return {"success": False, "error": f"No free problems found for difficulty: {difficulty}"}
            
            random_problem = random.choice(free_problems)
        
        # Validate wager duel if applicable
        opponent_wager = request.opponent_wager
        if is_wager:
            if not opponent_wager:
                return {"success": False, "error": "Opponent must specify their wager amount for wager duels"}
            
            min_wager = max(25, int(challenger_wager * 0.75))
            if opponent_wager < min_wager:
                return {"success": False, "error": f"Opponent wager must be at least {min_wager} XP (75% of challenger's {challenger_wager} XP)"}
            
            # Check opponent has enough XP
            opponent_data = UserOperations.get_user_data(accepting_username)
            if not opponent_data:
                return {"success": False, "error": f"User not found: {accepting_username}"}
            opponent_xp = int(opponent_data.get('xp', 0))
            if opponent_xp < opponent_wager:
                return {"success": False, "error": f"Insufficient XP (has {opponent_xp}, needs {opponent_wager})"}
        
        # Create the duel
        result = DuelOperations.create_duel(
            username=challenger_username,
            opponent=accepting_username,
            problem_slug=random_problem.get("titleSlug"),
            problem_title=random_problem.get("title"),
            problem_number=str(random_problem.get("frontendQuestionId", "")),
            difficulty=difficulty,
            is_wager=is_wager,
            wager_amount=challenger_wager if is_wager else None
        )
        
        # If wager duel, accept it immediately with opponent's wager
        if is_wager and result.get("success"):
            duel_id = result.get("data", {}).get("duel_id")
            if duel_id:
                accept_result = DuelOperations.accept_duel(
                    username=accepting_username,
                    duel_id=duel_id,
                    opponent_wager=opponent_wager
                )
                if not accept_result.get("success"):
                    return {"success": False, "error": "Failed to accept wager duel"}
        
        # Invalidate cache
        cache_manager.invalidate_all(CacheType.DUELS)
        
        return result
        
    except Exception as error:
        if DEBUG_MODE:
            print(f"[ERROR] Failed to accept duel link: {error}")
        return {"success": False, "error": str(error)}