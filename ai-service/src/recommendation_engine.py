from __future__ import annotations
import numpy as np
from sklearn.preprocessing import MinMaxScaler
from typing import Any


def score_apartments(
    apartments: list[dict],
    preferences: dict,
    swipe_history: list[dict],
) -> list[dict]:
    """
    Score and sort apartments for a tenant using content-based + behavioural filtering.

    Content-based: match against stored preferences (budget, city, rooms, amenities).
    Behavioural:   apartments similar to previously liked ones score higher.
    """
    if not apartments:
        return []

    liked_ids = {s["apartmentId"] for s in swipe_history if s.get("direction") in ("like", "superlike")}
    seen_ids  = {s["apartmentId"] for s in swipe_history}

    # Filter out already-seen apartments
    candidates = [a for a in apartments if a["id"] not in seen_ids]
    if not candidates:
        return []

    scores = np.zeros(len(candidates))

    budget_max = preferences.get("budget", {}).get("max", 99999)
    budget_min = preferences.get("budget", {}).get("min", 0)
    pref_cities   = {c.lower() for c in preferences.get("cities", [])}
    pref_rooms_min = preferences.get("rooms", {}).get("min", 0)
    pref_rooms_max = preferences.get("rooms", {}).get("max", 99)
    req_amenities  = set(preferences.get("requiredAmenities", []))

    for i, apt in enumerate(candidates):
        score = 0.0
        price = apt.get("price", 0)
        rooms = apt.get("rooms", 0)
        city  = apt.get("city", "").lower()
        amenities = set(apt.get("amenities", []))

        # Price fit (0–30 pts)
        if budget_min <= price <= budget_max:
            score += 30
        elif price < budget_min:
            score += 10
        else:
            overshoot = (price - budget_max) / max(budget_max, 1)
            score += max(0, 30 - overshoot * 60)

        # City match (0–25 pts)
        if pref_cities and city in pref_cities:
            score += 25
        elif not pref_cities:
            score += 10  # no preference → neutral

        # Rooms fit (0–20 pts)
        if pref_rooms_min <= rooms <= pref_rooms_max:
            score += 20
        else:
            diff = min(abs(rooms - pref_rooms_min), abs(rooms - pref_rooms_max))
            score += max(0, 20 - diff * 8)

        # Amenities (0–15 pts)
        if req_amenities:
            matched = len(req_amenities & amenities)
            score += (matched / len(req_amenities)) * 15

        # Popularity boost (0–5 pts)
        score += min(5, apt.get("likeCount", 0) * 0.1)

        # Behavioural: similarity to liked apartments
        if liked_ids:
            liked_apts = [a for a in apartments if a["id"] in liked_ids]
            sim = _similarity_boost(apt, liked_apts)
            score += sim * 5   # up to +5 pts

        scores[i] = score

    # Normalise to 0–100
    if scores.max() > 0:
        scores = (scores / scores.max()) * 100

    ranked = sorted(
        zip(candidates, scores.tolist()),
        key=lambda x: x[1],
        reverse=True,
    )

    return [
        {**apt, "_score": round(score, 1)}
        for apt, score in ranked
    ]


def _similarity_boost(apartment: dict, liked_apartments: list[dict]) -> float:
    """Return 0–1 similarity score based on shared attributes with liked apartments."""
    if not liked_apartments:
        return 0.0

    apt_amenities = set(apartment.get("amenities", []))
    apt_city = apartment.get("city", "").lower()
    apt_rooms = apartment.get("rooms", 0)

    sims = []
    for liked in liked_apartments:
        liked_amenities = set(liked.get("amenities", []))
        union = apt_amenities | liked_amenities
        amenity_sim = len(apt_amenities & liked_amenities) / len(union) if union else 0

        city_sim = 1.0 if apt_city == liked.get("city", "").lower() else 0.0
        rooms_diff = abs(apt_rooms - liked.get("rooms", 0))
        rooms_sim = max(0, 1 - rooms_diff * 0.25)

        sims.append(amenity_sim * 0.4 + city_sim * 0.4 + rooms_sim * 0.2)

    return float(np.mean(sims))
