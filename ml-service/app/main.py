"""FastAPI entrypoint. Models load once at startup (no retraining on boot)."""
from __future__ import annotations

import logging
import time
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Request
from fastapi.responses import JSONResponse

from app.analyzer import TicketAnalyzer, read_model_version
from app.classifiers import TextClassifier
from app.config import load_settings
from app.embeddings import create_embedder
from app.schemas import AnalyzeRequest, AnalyzeResponse, EmbedRequest, EmbedResponse, HealthResponse
from app.sentiment import create_sentiment_analyzer

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("ml-service")


def build_analyzer() -> TicketAnalyzer:
    settings = load_settings()
    return TicketAnalyzer(
        category_model=TextClassifier.load(settings.models_dir / "category.joblib"),
        priority_model=TextClassifier.load(settings.models_dir / "priority.joblib"),
        sentiment=create_sentiment_analyzer(settings.sentiment_backend, settings.sentiment_model),
        embedder=create_embedder(settings.embedding_backend, settings.embedding_model, settings.embedding_dim),
        model_version=read_model_version(settings.models_dir),
        max_chars=settings.max_text_chars,
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    started = time.perf_counter()
    app.state.analyzer = build_analyzer()
    logger.info("Models loaded in %.2fs (embedder=%s)", time.perf_counter() - started, app.state.analyzer.embedder.name)
    yield


app = FastAPI(title="Support Intel ML Service", version="1.0.0", lifespan=lifespan)


def get_analyzer(request: Request) -> TicketAnalyzer:
    return request.app.state.analyzer


@app.exception_handler(Exception)
async def unhandled(_: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled error: %s", exc)
    return JSONResponse(status_code=500, content={"error": "ML_INTERNAL_ERROR", "message": "Inference failed"})


@app.get("/health", response_model=HealthResponse)
def health(analyzer: TicketAnalyzer = Depends(get_analyzer)) -> HealthResponse:
    return HealthResponse(
        status="ok",
        modelVersion=analyzer.model_version,
        embedder=analyzer.embedder.name,
        embeddingDim=analyzer.embedder.dim,
        sentiment=analyzer.sentiment.name,
        categories=analyzer.category_model.labels,
        priorities=analyzer.priority_model.labels,
    )


@app.post("/v1/analyze", response_model=AnalyzeResponse)
def analyze(body: AnalyzeRequest, analyzer: TicketAnalyzer = Depends(get_analyzer)) -> AnalyzeResponse:
    return AnalyzeResponse(**analyzer.analyze(body.title, body.description))


@app.post("/v1/embed", response_model=EmbedResponse)
def embed(body: EmbedRequest, analyzer: TicketAnalyzer = Depends(get_analyzer)) -> EmbedResponse:
    return EmbedResponse(embeddings=analyzer.embed(body.texts), dim=analyzer.embedder.dim, model=analyzer.embedder.name)
