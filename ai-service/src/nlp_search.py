import json
import re
import httpx
from src.config import settings

GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "gemini-1.5-flash:generateContent"
)

SYSTEM_PROMPT = """You are a real estate search assistant for an Israeli apartment rental app.
Parse the free-text query (Hebrew or English) into a structured JSON filter object.

Output ONLY valid JSON with these optional fields:
{
  "city": string,
  "neighborhood": string,
  "minPrice": number,
  "maxPrice": number,
  "minRooms": number,
  "maxRooms": number,
  "amenities": string[],
  "petsAllowed": boolean,
  "availableFrom": "YYYY-MM-DD"
}

Amenity values: parking, balcony, elevator, ac, storage, pets_allowed, furnished, sun_boiler
Only include fields clearly stated. Output nothing but the JSON object."""


async def parse_query(query: str) -> dict:
    """Convert free-text apartment query to structured filters via Gemini."""
    if not settings.gemini_api_key:
        return {}

    payload = {
        "contents": [{
            "parts": [
                {"text": SYSTEM_PROMPT},
                {"text": f'Query: "{query}"'},
            ]
        }],
        "generationConfig": {"temperature": 0.1, "maxOutputTokens": 256},
    }

    async with httpx.AsyncClient(timeout=10) as client:
        res = await client.post(
            f"{GEMINI_URL}?key={settings.gemini_api_key}",
            json=payload,
        )
        res.raise_for_status()

    raw = res.json()["candidates"][0]["content"]["parts"][0]["text"]
    cleaned = re.sub(r"```json\n?|\n?```", "", raw).strip()
    return json.loads(cleaned)


async def generate_listing_summary(apartment: dict) -> str | None:
    """Generate a 2-sentence Hebrew marketing description for a listing."""
    if not settings.gemini_api_key:
        return None

    prompt = (
        f"Write a short, engaging 2-sentence Hebrew apartment listing description:\n"
        f"City: {apartment.get('city')}, Neighborhood: {apartment.get('neighborhood', 'N/A')}\n"
        f"Rooms: {apartment.get('rooms')}, Price: ₪{apartment.get('price')}/month\n"
        f"Amenities: {', '.join(apartment.get('amenities', [])) or 'None'}\n"
        "Keep it factual and appealing. Output only the description text."
    )

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.7, "maxOutputTokens": 128},
    }

    async with httpx.AsyncClient(timeout=10) as client:
        res = await client.post(
            f"{GEMINI_URL}?key={settings.gemini_api_key}",
            json=payload,
        )
        res.raise_for_status()

    return res.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
