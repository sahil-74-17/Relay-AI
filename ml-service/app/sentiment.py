"""Sentiment backends (Strategy), normalised to POSITIVE | NEUTRAL | NEGATIVE."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class SentimentResult:
    label: str
    score: float  # confidence in the label, 0..1
    compound: float  # signed polarity, -1..1


class SentimentAnalyzer(Protocol):
    name: str

    def analyze(self, text: str) -> SentimentResult: ...


class VaderSentimentAnalyzer:
    """Pretrained lexicon + rule model (VADER). Fast, CPU-only, tuned for short informal text."""

    SUPPORT_LEXICON = {
        "breach": -2.5, "hacked": -2.8, "outage": -2.5, "crash": -2.0, "crashes": -2.0, "crashing": -2.0,
        "broken": -2.0, "fails": -1.6, "failed": -1.6, "failing": -1.6, "failure": -1.8, "error": -1.3,
        "errors": -1.3, "declined": -1.4, "deducted": -1.0, "locked": -1.2, "stuck": -1.5, "timeout": -1.2,
        "unauthorized": -2.0, "fraud": -2.8, "lost": -1.5, "down": -0.8, "bug": -1.2, "blank": -0.8,
        "frustrating": -2.2, "unusable": -2.5, "asap": -0.8, "urgent": -0.8, "possible": 0.0,
    }
    NEG_THRESHOLD = -0.05
    POS_THRESHOLD = 0.05

    def __init__(self) -> None:
        from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

        self._analyzer = SentimentIntensityAnalyzer()
        # Domain adaptation: support vocabulary that general-purpose VADER treats as neutral.
        self._analyzer.lexicon.update(self.SUPPORT_LEXICON)
        self.name = "vader+support-lexicon"

    def analyze(self, text: str) -> SentimentResult:
        scores = self._analyzer.polarity_scores(text)
        compound = scores["compound"]
        if compound <= self.NEG_THRESHOLD:
            label = "NEGATIVE"
        elif compound >= self.POS_THRESHOLD:
            label = "POSITIVE"
        else:
            label = "NEUTRAL"
        score = abs(compound) if label != "NEUTRAL" else 1 - abs(compound) / self.POS_THRESHOLD
        return SentimentResult(label=label, score=round(min(max(score, 0.0), 1.0), 4), compound=compound)


class TransformerSentimentAnalyzer:
    """Optional: Hugging Face RoBERTa sentiment (needs torch + model download)."""

    _MAP = {"negative": "NEGATIVE", "neutral": "NEUTRAL", "positive": "POSITIVE"}

    def __init__(self, model_name: str) -> None:
        from transformers import pipeline

        self._pipe = pipeline("sentiment-analysis", model=model_name, truncation=True)
        self.name = model_name

    def analyze(self, text: str) -> SentimentResult:
        result = self._pipe(text[:2000])[0]
        label = self._MAP.get(result["label"].lower(), "NEUTRAL")
        sign = {"NEGATIVE": -1, "NEUTRAL": 0, "POSITIVE": 1}[label]
        return SentimentResult(label=label, score=round(float(result["score"]), 4), compound=sign * float(result["score"]))


def create_sentiment_analyzer(backend: str, model_name: str) -> SentimentAnalyzer:
    if backend == "vader":
        return VaderSentimentAnalyzer()
    if backend == "transformer":
        return TransformerSentimentAnalyzer(model_name)
    raise ValueError(f"Unknown SENTIMENT_BACKEND: {backend}")
