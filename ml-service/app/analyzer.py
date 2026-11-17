"""TicketAnalyzer: composes classifiers, sentiment and embeddings (Facade).

Depends on abstractions (TextClassifier, SentimentAnalyzer, Embedder) injected
at startup, so backends can be swapped without touching this class.
"""
from __future__ import annotations

import json
from dataclasses import asdict
from pathlib import Path

from app.classifiers import TextClassifier
from app.embeddings import Embedder
from app.sentiment import SentimentAnalyzer
from app.text import normalize, ticket_text


class TicketAnalyzer:
    def __init__(
        self,
        category_model: TextClassifier,
        priority_model: TextClassifier,
        sentiment: SentimentAnalyzer,
        embedder: Embedder,
        model_version: str,
        max_chars: int,
    ) -> None:
        self.category_model = category_model
        self.priority_model = priority_model
        self.sentiment = sentiment
        self.embedder = embedder
        self.model_version = model_version
        self.max_chars = max_chars

    def analyze(self, title: str, description: str) -> dict:
        text = ticket_text(title, description)[: self.max_chars]
        category = self.category_model.predict(text)
        priority = self.priority_model.predict(text)
        sentiment = self.sentiment.analyze(normalize(f"{title}. {description}")[: self.max_chars])
        embedding = self.embedder.embed([normalize(f"{title}. {description}")[: self.max_chars]])[0]
        return {
            "category": asdict(category),
            "priority": asdict(priority),
            "sentiment": asdict(sentiment),
            "embedding": embedding,
            "modelVersion": self.model_version,
        }

    def embed(self, texts: list[str]) -> list[list[float]]:
        return self.embedder.embed([normalize(t)[: self.max_chars] for t in texts])


def read_model_version(models_dir: Path) -> str:
    metrics = models_dir / "metrics.json"
    if metrics.exists():
        return str(json.loads(metrics.read_text()).get("version", "unknown"))
    return "unknown"
