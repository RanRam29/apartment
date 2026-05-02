"""Unit tests for lead_scoring.score_leads."""
import pytest
from src.lead_scoring import score_leads


def _lead(id, direction="like", seen_ms=0, budget_max=0, cities=None,
          verified=False, phone=None):
    return {
        "id": id,
        "swipeDirection": direction,
        "seenDurationMs": seen_ms,
        "isVerified": verified,
        "phone": phone,
        "preferences": {
            "budget": {"max": budget_max},
            "cities": cities or [],
        },
    }


def test_empty_leads_returns_empty():
    assert score_leads([], {}) == []


def test_leads_sorted_by_score_descending():
    leads = [
        _lead("a", direction="like",      seen_ms=1000),
        _lead("b", direction="superlike", seen_ms=9000, verified=True),
    ]
    result = score_leads(leads, {"price": 5000, "city": "תל אביב"})
    scores = [l["_leadScore"] for l in result]
    assert scores == sorted(scores, reverse=True)
    assert result[0]["id"] == "b"


def test_superlike_scores_higher_than_like():
    leads = [
        _lead("like_only",  direction="like"),
        _lead("superliked", direction="superlike"),
    ]
    result = score_leads(leads, {"price": 5000})
    assert result[0]["id"] == "superliked"


def test_budget_fit_full_score():
    leads = [
        _lead("fits",     budget_max=7000),
        _lead("too_low",  budget_max=3000),
    ]
    result = score_leads(leads, {"price": 5000, "city": "תל אביב"})
    assert result[0]["id"] == "fits"


def test_seen_duration_bonus():
    leads = [
        _lead("quick",  seen_ms=500),
        _lead("long",   seen_ms=8000),
    ]
    result = score_leads(leads, {"price": 5000})
    assert result[0]["id"] == "long"


def test_verified_bonus():
    leads = [
        _lead("unverified", verified=False),
        _lead("verified",   verified=True),
    ]
    result = score_leads(leads, {"price": 5000})
    assert result[0]["id"] == "verified"


def test_phone_bonus():
    leads = [
        _lead("no_phone",   phone=None),
        _lead("has_phone",  phone="050-1234567"),
    ]
    result = score_leads(leads, {"price": 5000})
    assert result[0]["id"] == "has_phone"


def test_city_match_bonus():
    leads = [
        _lead("city_match",  cities=["תל אביב"]),
        _lead("no_city",     cities=[]),
    ]
    result = score_leads(leads, {"price": 5000, "city": "תל אביב"})
    assert result[0]["id"] == "city_match"


def test_all_fields_combined():
    """Best lead has all positive signals."""
    leads = [
        _lead("best",  direction="superlike", seen_ms=10000, budget_max=8000,
              cities=["תל אביב"], verified=True, phone="050-111"),
        _lead("worst", direction="like",      seen_ms=100,   budget_max=1000,
              cities=["חיפה"],   verified=False, phone=None),
    ]
    result = score_leads(leads, {"price": 5000, "city": "תל אביב"})
    assert result[0]["id"] == "best"
    assert result[0]["_leadScore"] > result[1]["_leadScore"]
