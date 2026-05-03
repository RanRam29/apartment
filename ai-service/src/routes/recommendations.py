from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from src.recommendation_engine import score_apartments
from src.database import get_mongo

router = APIRouter()


class RecommendRequest(BaseModel):
    user_id: str
    apartments: list[dict]


@router.post("/score")
async def score(req: RecommendRequest):
    """Score and rank a list of apartments for a specific tenant."""
    db = get_mongo()
    if db is None:
        raise HTTPException(status_code=503, detail="MongoDB unavailable")

    prefs_doc = await db.user_preferences.find_one({"userId": req.user_id})
    preferences  = prefs_doc or {}
    swipe_history = preferences.pop("swipeHistory", [])

    ranked = score_apartments(req.apartments, preferences, swipe_history)
    return {"apartments": ranked, "total": len(ranked)}
