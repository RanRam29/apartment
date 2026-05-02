"""Unit tests for recommendation_engine.score_apartments."""
import pytest
from src.recommendation_engine import score_apartments


def _apt(id, price=5000, city="תל אביב", rooms=3, amenities=None, like_count=0):
    return {
        "id": id,
        "price": price,
        "city": city,
        "rooms": rooms,
        "amenities": amenities or [],
        "viewCount": 10,
        "likeCount": like_count,
    }


def test_empty_input_returns_empty():
    assert score_apartments([], {}, []) == []


def test_already_seen_apartments_excluded():
    apts = [_apt("1"), _apt("2")]
    history = [{"apartmentId": "1", "direction": "like"}]
    result = score_apartments(apts, {}, history)
    ids = [a["id"] for a in result]
    assert "1" not in ids
    assert "2" in ids


def test_results_sorted_by_score_descending():
    apts = [
        _apt("low",  price=12000, city="חיפה",    rooms=5),
        _apt("high", price=5500,  city="תל אביב", rooms=3),
    ]
    prefs = {
        "budget": {"min": 4000, "max": 7000},
        "cities": ["תל אביב"],
        "rooms":  {"min": 2, "max": 4},
    }
    result = score_apartments(apts, prefs, [])
    scores = [a["_score"] for a in result]
    assert scores == sorted(scores, reverse=True)


def test_city_match_boosts_score():
    apts = [
        _apt("ta",  city="תל אביב"),
        _apt("hfa", city="חיפה"),
    ]
    prefs = {"cities": ["תל אביב"]}
    result = score_apartments(apts, prefs, [])
    assert result[0]["id"] == "ta"


def test_budget_fit_boosts_score():
    apts = [
        _apt("cheap",    price=3000),
        _apt("fits",     price=5000),
        _apt("too_pricey", price=15000),
    ]
    prefs = {"budget": {"min": 4000, "max": 6000}}
    result = score_apartments(apts, prefs, [])
    # The apartment within budget should score highest
    assert result[0]["id"] == "fits"


def test_amenity_match_boosts_score():
    apts = [
        _apt("with_ac",    amenities=["ac", "parking"]),
        _apt("without_ac", amenities=[]),
    ]
    prefs = {"requiredAmenities": ["ac"]}
    result = score_apartments(apts, prefs, [])
    assert result[0]["id"] == "with_ac"


def test_popularity_boost():
    apts = [
        _apt("popular",   like_count=50),
        _apt("unpopular", like_count=0),
    ]
    # No preferences → only popularity differs
    result = score_apartments(apts, {}, [])
    assert result[0]["id"] == "popular"


def test_normalised_scores_in_0_100_range():
    apts = [_apt(str(i), price=5000 + i * 100) for i in range(5)]
    prefs = {"budget": {"min": 4000, "max": 8000}}
    result = score_apartments(apts, prefs, [])
    for a in result:
        assert 0 <= a["_score"] <= 100


def test_behavioural_boost_from_liked_cities():
    liked_apt = _apt("liked", city="ירושלים")
    similar   = _apt("sim",  city="ירושלים")
    different = _apt("diff", city="אשדוד")

    history = [{"apartmentId": "liked", "direction": "like"}]
    all_apts = [liked_apt, similar, different]
    result = score_apartments(all_apts, {}, history)
    # "liked" is excluded; "sim" should outscore "diff"
    ids = [a["id"] for a in result]
    assert "liked" not in ids
    sim_pos  = ids.index("sim")
    diff_pos = ids.index("diff")
    assert sim_pos < diff_pos
