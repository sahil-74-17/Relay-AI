"""Service configuration, read once from environment variables."""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


@dataclass(frozen=True)
class Settings:
    models_dir: Path
    embedding_backend: str  # "sentence-transformers" | "hashing"
    embedding_model: str
    embedding_dim: int
    sentiment_backend: str  # "vader" | "transformer"
    sentiment_model: str
    max_text_chars: int


def load_settings() -> Settings:
    return Settings(
        models_dir=Path(os.getenv("ML_MODELS_DIR", BASE_DIR / "models")),
        embedding_backend=os.getenv("EMBEDDING_BACKEND", "sentence-transformers"),
        embedding_model=os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2"),
        embedding_dim=int(os.getenv("EMBEDDING_DIM", "384")),
        sentiment_backend=os.getenv("SENTIMENT_BACKEND", "vader"),
        sentiment_model=os.getenv(
            "SENTIMENT_MODEL", "cardiffnlp/twitter-roberta-base-sentiment-latest"
        ),
        max_text_chars=int(os.getenv("ML_MAX_TEXT_CHARS", "8000")),
    )
