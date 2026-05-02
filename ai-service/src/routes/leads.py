from fastapi import APIRouter
from pydantic import BaseModel
from src.lead_scoring import score_leads

router = APIRouter()


class LeadScoreRequest(BaseModel):
    apartment: dict
    leads: list[dict]


@router.post("/score")
async def score(req: LeadScoreRequest):
    """Score and rank tenant leads for a landlord's apartment."""
    ranked = score_leads(req.leads, req.apartment)
    return {"leads": ranked, "total": len(ranked)}
