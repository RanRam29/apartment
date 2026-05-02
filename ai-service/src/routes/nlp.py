import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from src.nlp_search import parse_query, generate_listing_summary
from src.database import get_redis

router = APIRouter()


class SearchRequest(BaseModel):
    query: str
    user_id: str | None = None


class SummaryRequest(BaseModel):
    apartment: dict


@router.post("/parse")
async def nlp_parse(req: SearchRequest):
    """Parse free-text search query into structured filters."""
    if len(req.query.strip()) < 2:
        raise HTTPException(status_code=422, detail="Query too short")

    # Cache identical queries for 5 min
    cache_key = f"nlp:{req.query[:80]}"
    redis = get_redis()
    if redis:
        cached = await redis.get(cache_key)
        if cached:
            return {"filters": json.loads(cached), "fromCache": True}

    try:
        filters = await parse_query(req.query)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Gemini error: {str(e)}")

    if redis:
        await redis.setex(cache_key, 300, json.dumps(filters))

    return {"filters": filters, "query": req.query}


@router.post("/summary")
async def listing_summary(req: SummaryRequest):
    """Generate a Hebrew marketing summary for an apartment listing."""
    try:
        summary = await generate_listing_summary(req.apartment)
        return {"summary": summary}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Gemini error: {str(e)}")
