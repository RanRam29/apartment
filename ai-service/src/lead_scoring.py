from __future__ import annotations


def score_leads(leads: list[dict], apartment: dict) -> list[dict]:
    """
    Score and rank tenant leads for a specific apartment.

    Factors:
    - Budget fit:      tenant max budget vs apartment price
    - Engagement:      superlike > like (seenDurationMs bonus)
    - Profile quality: verified, has phone
    - Activity:        recently active
    """
    if not leads:
        return []

    apt_price = apartment.get("price", 0)
    scored = []

    for lead in leads:
        score = 0.0
        prefs = lead.get("preferences", {})

        # Budget fit (0–35 pts)
        budget_max = prefs.get("budget", {}).get("max", 0)
        if budget_max >= apt_price:
            score += 35
        elif budget_max > 0:
            ratio = budget_max / apt_price
            score += ratio * 35

        # Swipe direction (0–25 pts)
        direction = lead.get("swipeDirection", "like")
        if direction == "superlike":
            score += 25
        elif direction == "like":
            score += 15

        # Time spent on card (0–10 pts)
        seen_ms = lead.get("seenDurationMs", 0) or 0
        if seen_ms > 5000:
            score += 10
        elif seen_ms > 2000:
            score += 5

        # Profile quality (0–15 pts)
        if lead.get("isVerified"):
            score += 10
        if lead.get("phone"):
            score += 5

        # City match (0–15 pts)
        tenant_cities = [c.lower() for c in prefs.get("cities", [])]
        apt_city = apartment.get("city", "").lower()
        if apt_city in tenant_cities:
            score += 15

        scored.append({**lead, "_leadScore": round(score, 1)})

    return sorted(scored, key=lambda x: x["_leadScore"], reverse=True)
