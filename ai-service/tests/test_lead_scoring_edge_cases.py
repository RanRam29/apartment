from src.lead_scoring import score_leads


def test_lead_scoring_handles_empty_apartment_fields():
    leads = [
        {"id": "l1", "preferences": {"budget": {"max": 1000}}, "swipeDirection": "like"},
        {"id": "l2", "preferences": {"budget": {"max": 10000}}, "swipeDirection": "superlike"},
    ]
    scored = score_leads(leads, {})
    assert len(scored) == 2
    assert scored[0]["id"] == "l2"


def test_lead_scoring_missing_preferences_defaults():
    leads = [{"id": "l1"}, {"id": "l2", "isVerified": True, "phone": "050-111"}]
    scored = score_leads(leads, {"price": 5000})
    assert len(scored) == 2
    assert scored[0]["_leadScore"] >= scored[1]["_leadScore"]


def test_lead_scoring_city_match_boost_edge_case():
    leads = [
        {"id": "city", "preferences": {"cities": ["תל אביב"], "budget": {"max": 9000}}, "swipeDirection": "like"},
        {"id": "no-city", "preferences": {"cities": [], "budget": {"max": 9000}}, "swipeDirection": "like"},
    ]
    scored = score_leads(leads, {"price": 5000, "city": "תל אביב"})
    assert scored[0]["id"] == "city"
