from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.routes import nlp


def _client():
    app = FastAPI()
    app.include_router(nlp.router, prefix="/api/nlp")
    return TestClient(app)


def test_nlp_parse_accepts_valid_query_without_redis(monkeypatch):
    monkeypatch.setattr("src.routes.nlp.get_redis", lambda: None)

    async def _parse_query(query):
        return {"city": "תל אביב", "q": query}

    monkeypatch.setattr("src.routes.nlp.parse_query", _parse_query)

    client = _client()
    res = client.post("/api/nlp/parse", json={"query": "דירה בתל אביב"})

    assert res.status_code == 200
    body = res.json()
    assert body["filters"]["city"] == "תל אביב"


def test_nlp_parse_handles_upstream_failure(monkeypatch):
    monkeypatch.setattr("src.routes.nlp.get_redis", lambda: None)

    def _boom(_query):
        raise RuntimeError("gemini down")

    monkeypatch.setattr("src.routes.nlp.parse_query", _boom)

    client = _client()
    res = client.post("/api/nlp/parse", json={"query": "דירה"})

    assert res.status_code == 502
    assert "Gemini error" in res.text


def test_nlp_summary_handles_generator_failure(monkeypatch):
    async def _boom(_apt):
        raise RuntimeError("summary down")

    monkeypatch.setattr("src.routes.nlp.generate_listing_summary", _boom)

    client = _client()
    res = client.post("/api/nlp/summary", json={"apartment": {"city": "תל אביב", "price": 5000}})

    assert res.status_code == 502
