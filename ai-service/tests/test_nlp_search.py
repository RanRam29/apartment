"""
Unit tests for nlp_search module.

These tests mock the Gemini HTTP call so no real API key is needed.
They verify query parsing logic, JSON extraction, and graceful degradation.
"""
import json
import pytest
from unittest.mock import AsyncMock, patch, MagicMock


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _make_gemini_response(json_payload: dict) -> MagicMock:
    """Build a fake httpx response that returns json_payload wrapped in Gemini's envelope."""
    text = json.dumps(json_payload)
    mock_resp = MagicMock()
    mock_resp.raise_for_status = MagicMock()
    mock_resp.json.return_value = {
        "candidates": [{
            "content": {
                "parts": [{"text": text}]
            }
        }]
    }
    return mock_resp


def _make_gemini_response_with_markdown(json_payload: dict) -> MagicMock:
    """Gemini sometimes wraps JSON in markdown code fences — test that we strip them."""
    text = f"```json\n{json.dumps(json_payload)}\n```"
    mock_resp = MagicMock()
    mock_resp.raise_for_status = MagicMock()
    mock_resp.json.return_value = {
        "candidates": [{"content": {"parts": [{"text": text}]}}]
    }
    return mock_resp


# ─── parse_query tests ────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_parse_query_returns_empty_dict_without_api_key():
    """When GEMINI_API_KEY is not set, parse_query returns {} immediately."""
    from src.nlp_search import parse_query
    from src import config as cfg_module

    original = cfg_module.settings.gemini_api_key
    try:
        cfg_module.settings.gemini_api_key = ""
        result = await parse_query("דירה 3 חדרים תל אביב")
        assert result == {}
    finally:
        cfg_module.settings.gemini_api_key = original


@pytest.mark.asyncio
async def test_parse_query_city_extraction():
    """Extracted city field is returned correctly."""
    from src.nlp_search import parse_query
    from src import config as cfg_module

    cfg_module.settings.gemini_api_key = "fake_key"
    fake_filters = {"city": "תל אביב", "minRooms": 2}
    mock_resp = _make_gemini_response(fake_filters)

    with patch("httpx.AsyncClient") as mock_client_cls:
        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.post = AsyncMock(return_value=mock_resp)
        mock_client_cls.return_value = mock_client

        result = await parse_query("דירה 2 חדרים בתל אביב")

    assert result["city"] == "תל אביב"
    assert result["minRooms"] == 2


@pytest.mark.asyncio
async def test_parse_query_price_range():
    """Budget constraints are extracted into minPrice/maxPrice."""
    from src.nlp_search import parse_query
    from src import config as cfg_module

    cfg_module.settings.gemini_api_key = "fake_key"
    fake_filters = {"minPrice": 4000, "maxPrice": 7000}
    mock_resp = _make_gemini_response(fake_filters)

    with patch("httpx.AsyncClient") as mock_client_cls:
        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.post = AsyncMock(return_value=mock_resp)
        mock_client_cls.return_value = mock_client

        result = await parse_query("apartment between 4000 and 7000 shekels")

    assert result["minPrice"] == 4000
    assert result["maxPrice"] == 7000


@pytest.mark.asyncio
async def test_parse_query_amenities_extracted():
    """Amenities like parking and balcony are extracted as a list."""
    from src.nlp_search import parse_query
    from src import config as cfg_module

    cfg_module.settings.gemini_api_key = "fake_key"
    fake_filters = {"amenities": ["parking", "balcony"], "city": "חיפה"}
    mock_resp = _make_gemini_response(fake_filters)

    with patch("httpx.AsyncClient") as mock_client_cls:
        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.post = AsyncMock(return_value=mock_resp)
        mock_client_cls.return_value = mock_client

        result = await parse_query("דירה בחיפה עם חניה ומרפסת")

    assert "parking" in result["amenities"]
    assert "balcony" in result["amenities"]


@pytest.mark.asyncio
async def test_parse_query_strips_markdown_code_fences():
    """JSON wrapped in ```json...``` code fences is parsed correctly."""
    from src.nlp_search import parse_query
    from src import config as cfg_module

    cfg_module.settings.gemini_api_key = "fake_key"
    fake_filters = {"city": "ירושלים", "minRooms": 3}
    mock_resp = _make_gemini_response_with_markdown(fake_filters)

    with patch("httpx.AsyncClient") as mock_client_cls:
        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.post = AsyncMock(return_value=mock_resp)
        mock_client_cls.return_value = mock_client

        result = await parse_query("3 room flat in Jerusalem")

    assert result["city"] == "ירושלים"
    assert result["minRooms"] == 3


@pytest.mark.asyncio
async def test_parse_query_pets_allowed():
    """petsAllowed boolean is extracted."""
    from src.nlp_search import parse_query
    from src import config as cfg_module

    cfg_module.settings.gemini_api_key = "fake_key"
    fake_filters = {"petsAllowed": True, "city": "רעננה"}
    mock_resp = _make_gemini_response(fake_filters)

    with patch("httpx.AsyncClient") as mock_client_cls:
        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.post = AsyncMock(return_value=mock_resp)
        mock_client_cls.return_value = mock_client

        result = await parse_query("pet friendly apartment in Raanana")

    assert result["petsAllowed"] is True


@pytest.mark.asyncio
async def test_parse_query_hebrew_input_passes_through():
    """Hebrew query string is forwarded to Gemini unchanged."""
    from src.nlp_search import parse_query
    from src import config as cfg_module

    cfg_module.settings.gemini_api_key = "fake_key"
    captured_payloads = []

    async def capture_post(url, json=None, **kwargs):
        captured_payloads.append(json)
        return _make_gemini_response({})

    with patch("httpx.AsyncClient") as mock_client_cls:
        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.post = AsyncMock(side_effect=capture_post)
        mock_client_cls.return_value = mock_client

        await parse_query("דירה 4 חדרים בתל אביב עם מרפסת")

    assert len(captured_payloads) == 1
    payload_text = str(captured_payloads[0])
    assert "דירה 4 חדרים בתל אביב עם מרפסת" in payload_text


# ─── generate_listing_summary tests ──────────────────────────────────────────

@pytest.mark.asyncio
async def test_generate_listing_summary_returns_none_without_api_key():
    """When GEMINI_API_KEY is not set, generate_listing_summary returns None."""
    from src.nlp_search import generate_listing_summary
    from src import config as cfg_module

    original = cfg_module.settings.gemini_api_key
    try:
        cfg_module.settings.gemini_api_key = ""
        result = await generate_listing_summary({"title": "Test", "city": "תל אביב"})
        assert result is None
    finally:
        cfg_module.settings.gemini_api_key = original


@pytest.mark.asyncio
async def test_generate_listing_summary_returns_string():
    """When Gemini responds, a non-empty string summary is returned."""
    from src.nlp_search import generate_listing_summary
    from src import config as cfg_module

    cfg_module.settings.gemini_api_key = "fake_key"
    summary_text = "דירה יפהפייה במרכז תל אביב. מתאימה לזוגות צעירים."

    mock_resp = MagicMock()
    mock_resp.raise_for_status = MagicMock()
    mock_resp.json.return_value = {
        "candidates": [{"content": {"parts": [{"text": summary_text}]}}]
    }

    with patch("httpx.AsyncClient") as mock_client_cls:
        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.post = AsyncMock(return_value=mock_resp)
        mock_client_cls.return_value = mock_client

        result = await generate_listing_summary({
            "title": "דירה 3 חדרים",
            "city": "תל אביב",
            "price": 7000,
            "rooms": 3,
        })

    assert isinstance(result, str)
    assert len(result) > 0
