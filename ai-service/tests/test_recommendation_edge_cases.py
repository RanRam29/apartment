from src.recommendation_engine import score_apartments


def test_recommendations_return_empty_when_all_seen():
    apartments = [{"id": "a1", "price": 5000, "city": "תל אביב", "rooms": 3, "amenities": []}]
    history = [{"apartmentId": "a1", "direction": "like"}]
    result = score_apartments(apartments, {}, history)
    assert result == []


def test_recommendations_handle_missing_optional_fields():
    apartments = [
        {"id": "a1"},
        {"id": "a2", "price": 6000},
    ]
    result = score_apartments(apartments, {"cities": []}, [])
    assert len(result) == 2
    assert all("_score" in apt for apt in result)


def test_recommendations_budget_overshoot_penalty_applies():
    apartments = [
        {"id": "fit", "price": 5000, "city": "תל אביב", "rooms": 3, "amenities": [], "likeCount": 0},
        {"id": "high", "price": 20000, "city": "תל אביב", "rooms": 3, "amenities": [], "likeCount": 0},
    ]
    prefs = {"budget": {"min": 3000, "max": 7000}, "cities": ["תל אביב"]}
    ranked = score_apartments(apartments, prefs, [])
    assert ranked[0]["id"] == "fit"
