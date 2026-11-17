"""Request/response DTOs with validation."""
from __future__ import annotations

from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    description: str = Field(default="", max_length=20000)


class LabelPrediction(BaseModel):
    label: str
    confidence: float
    scores: dict[str, float]


class SentimentPrediction(BaseModel):
    label: str
    score: float
    compound: float


class AnalyzeResponse(BaseModel):
    category: LabelPrediction
    priority: LabelPrediction
    sentiment: SentimentPrediction
    embedding: list[float]
    modelVersion: str


class EmbedRequest(BaseModel):
    texts: list[str] = Field(min_length=1, max_length=128)


class EmbedResponse(BaseModel):
    embeddings: list[list[float]]
    dim: int
    model: str


class HealthResponse(BaseModel):
    status: str
    modelVersion: str
    embedder: str
    embeddingDim: int
    sentiment: str
    categories: list[str]
    priorities: list[str]
