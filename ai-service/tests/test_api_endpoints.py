from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.routes import leads, nlp, recommendations


class _FakeRedis:
    def __init__(self, initial=None):
        self._store = initial or {}

    async def get(self, key):
        return self._store.get(key)

    async def setex(self, key, _ttl, value):
        self._store[key] = value


class _FakeCollection:
    def __init__(self, doc):
        self._doc = doc

    async def find_one(self, _query):
        return self._doc


class _FakeMongo:
    def __init__(self, pref_doc):
        self.user_preferences = _FakeCollection(pref_doc)


def _client():
    app = FastAPI()
    app.include_router(nlp.router, prefix="/api/nlp")
    app.include_router(recommendations.router, prefix="/api/recommendations")
    app.include_router(leads.router, prefix="/api/leads")
    return TestClient(app)


def test_nlp_parse_rejects_too_short_query():
    client = _client()
    res = client.post("/api/nlp/parse", json={"query": " "})
    assert res.status_code == 422
    assert "Query too short" in res.text


def test_nlp_parse_uses_cache_when_available(monkeypatch):
    monkeypatch.setattr(
        "src.routes.nlp.get_redis",
        lambda: _FakeRedis({"nlp:דירה בתל אביב": '{"city":"תל אביב","rooms":{"min":2}}'}),
    )
    # Should not be called if cache hit works.
    monkeypatch.setattr("src.routes.nlp.parse_query", lambda _query: (_ for _ in ()).throw(RuntimeError("unexpected")))

    client = _client()
    res = client.post("/api/nlp/parse", json={"query": "דירה בתל אביב"})

    assert res.status_code == 200
    body = res.json()
    assert body["fromCache"] is True
    assert body["filters"]["city"] == "תל אביב"


def test_recommendations_score_returns_503_when_mongo_unavailable(monkeypatch):
    monkeypatch.setattr("src.routes.recommendations.get_mongo", lambda: None)

    client = _client()
    res = client.post("/api/recommendations/score", json={"user_id": "u1", "apartments": []})

    assert res.status_code == 503
    assert "MongoDB unavailable" in res.text


def test_recommendations_score_with_preferences(monkeypatch):
    monkeypatch.setattr(
        "src.routes.recommendations.get_mongo",
        lambda: _FakeMongo(
            {
                "userId": "u1",
                "budget": {"min": 4000, "max": 7000},
                "cities": ["תל אביב"],
                "swipeHistory": [],
            }
        ),
    )

    client = _client()
    res = client.post(
        "/api/recommendations/score",
        json={
            "user_id": "u1",
            "apartments": [
                {"id": "a1", "price": 5500, "city": "תל אביב", "rooms": 3, "amenities": []},
                {"id": "a2", "price": 11000, "city": "חיפה", "rooms": 4, "amenities": []},
            ],
        },
    )

    assert res.status_code == 200
    body = res.json()
    assert body["total"] == 2
    assert body["apartments"][0]["id"] == "a1"


def test_leads_score_endpoint_and_payload_validation():
    client = _client()

    bad = client.post("/api/leads/score", json={"apartment": {"price": 5000}})
    assert bad.status_code == 422

    good = client.post(
        "/api/leads/score",
        json={
            "apartment": {"price": 5000, "city": "תל אביב"},
            "leads": [
                {
                    "id": "l1",
                    "swipeDirection": "like",
                    "seenDurationMs": 1000,
                    "isVerified": False,
                    "phone": None,
                    "preferences": {"budget": {"max": 4000}, "cities": []},
                },
                {
                    "id": "l2",
                    "swipeDirection": "superlike",
                    "seenDurationMs": 9000,
                    "isVerified": True,
                    "phone": "050-123",
                    "preferences": {"budget": {"max": 7000}, "cities": ["תל אביב"]},
                },
            ],
        },
    )

    assert good.status_code == 200
    body = good.json()
    assert body["total"] == 2
    assert body["leads"][0]["id"] == "l2"
