"""Unit tests for nlp_search.parse_query (offline — no Gemini API key needed)."""
import json
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from src.nlp_search import parse_query


@pytest.mark.asyncio
async def test_parse_query_no_api_key_returns_empty(monkeypatch):
    """With no Gemini key configured, parse_query returns an empty dict."""
    monkeypatch.setattr("src.nlp_search.settings.gemini_api_key", "")
    result = await parse_query("3 rooms in Tel Aviv")
    assert result == {}


@pytest.mark.asyncio
async def test_parse_query_returns_structured_filters():
    """Mocked Gemini response is correctly parsed into a filter dict."""
    mock_response_body = {
        "candidates": [{
            "content": {
                "parts": [{
                    "text": json.dumps({
                        "city": "תל אביב",
                        "maxPrice": 7000,
                        "minRooms": 3,
                        "amenities": ["parking"],
                    })
                }]
            }
        }]
    }

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = mock_response_body

    with patch("src.nlp_search.settings.gemini_api_key", "fake-key"), \
         patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_resp):
        result = await parse_query("3 חדרים בתל אביב עד 7000 עם חניה")

    assert result.get("city") == "תל אביב"
    assert result.get("maxPrice") == 7000
    assert result.get("minRooms") == 3
    assert "parking" in result.get("amenities", [])


@pytest.mark.asyncio
async def test_parse_query_handles_api_error_gracefully():
    """When Gemini returns an error status, parse_query returns empty dict."""
    mock_resp = MagicMock()
    mock_resp.status_code = 500
    mock_resp.json.return_value = {"error": "internal"}

    with patch("src.nlp_search.settings.gemini_api_key", "fake-key"), \
         patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_resp):
        result = await parse_query("דירה בחיפה")

    assert result == {}


@pytest.mark.asyncio
async def test_parse_query_handles_invalid_json_from_api():
    """When Gemini returns non-JSON text, parse_query returns empty dict."""
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "candidates": [{
            "content": {
                "parts": [{"text": "לא יודע"}]
            }
        }]
    }

    with patch("src.nlp_search.settings.gemini_api_key", "fake-key"), \
         patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_resp):
        result = await parse_query("something unclear")

    assert result == {}


@pytest.mark.asyncio
async def test_parse_query_timeout_returns_empty():
    """On network timeout, parse_query returns empty dict (no crash)."""
    import httpx

    with patch("src.nlp_search.settings.gemini_api_key", "fake-key"), \
         patch("httpx.AsyncClient.post", new_callable=AsyncMock,
               side_effect=httpx.TimeoutException("timeout")):
        result = await parse_query("סטודיו בירושלים")

    assert result == {}
