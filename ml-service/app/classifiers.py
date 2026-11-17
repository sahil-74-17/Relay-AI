"""Wrapper around a trained scikit-learn pipeline that returns label + confidence."""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import joblib


@dataclass(frozen=True)
class Prediction:
    label: str
    confidence: float
    scores: dict[str, float]


class TextClassifier:
    def __init__(self, model: object, name: str) -> None:
        self._model = model
        self.name = name
        self.labels: list[str] = [str(c) for c in model.classes_]  # type: ignore[attr-defined]

    @classmethod
    def load(cls, path: Path) -> "TextClassifier":
        if not path.exists():
            raise FileNotFoundError(
                f"Model not found at {path}. Run: python -m training.generate_dataset && python -m training.train"
            )
        return cls(joblib.load(path), path.stem)

    def predict(self, text: str) -> Prediction:
        probabilities = self._model.predict_proba([text])[0]  # type: ignore[attr-defined]
        scores = {label: round(float(p), 4) for label, p in zip(self.labels, probabilities)}
        label = max(scores, key=scores.get)
        return Prediction(label=label, confidence=scores[label], scores=scores)
