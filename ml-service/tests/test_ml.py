import pytest
from fastapi.testclient import TestClient

from app.embeddings import HashingEmbedder
from app.main import app
from app.text import ticket_text


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_health_reports_models(client):
    body = client.get("/health").json()
    assert body["status"] == "ok"
    assert set(body["categories"]) == {"ACCOUNT", "BILLING", "TECHNICAL", "FEATURE_REQUEST", "GENERAL"}
    assert body["embeddingDim"] == 384


@pytest.mark.parametrize(
    "title,description,expected",
    [
        ("Charged twice for subscription", "My card was billed two times this month, I need a refund", "BILLING"),
        ("Cannot log in", "Password reset email never arrives and my account is locked", "ACCOUNT"),
        ("API returns 500 errors", "The orders endpoint fails and webhooks are not delivered", "TECHNICAL"),
        ("Please add dark mode", "It would be great to have a dark mode option", "FEATURE_REQUEST"),
    ],
)
def test_category_prediction(client, title, description, expected):
    body = client.post("/v1/analyze", json={"title": title, "description": description}).json()
    assert body["category"]["label"] == expected
    assert 0 <= body["category"]["confidence"] <= 1
    assert abs(sum(body["category"]["scores"].values()) - 1) < 0.01


def test_urgent_outage_is_high_priority(client):
    body = client.post(
        "/v1/analyze",
        json={"title": "Production down", "description": "Outage, all users affected, emergency"},
    ).json()
    assert body["priority"]["label"] in {"HIGH", "CRITICAL"}


def test_sentiment_negative_for_angry_text(client):
    body = client.post(
        "/v1/analyze",
        json={"title": "Terrible experience", "description": "This is awful and frustrating, I hate this broken app"},
    ).json()
    assert body["sentiment"]["label"] == "NEGATIVE"


def test_embedding_dimension_and_validation(client):
    body = client.post("/v1/embed", json={"texts": ["hello world", "refund policy"]}).json()
    assert len(body["embeddings"]) == 2 and len(body["embeddings"][0]) == 384
    assert client.post("/v1/analyze", json={"title": ""}).status_code == 422


def test_hashing_embedder_similarity_is_meaningful():
    emb = HashingEmbedder(384)
    a, b, c = emb.embed(["payment failed at checkout", "checkout payment failed again", "dark mode request"])
    dot = lambda x, y: sum(i * j for i, j in zip(x, y))  # noqa: E731
    assert dot(a, b) > dot(a, c)


def test_ticket_text_weights_title():
    assert ticket_text("  Refund ", "please") == "Refund. Refund. please"
