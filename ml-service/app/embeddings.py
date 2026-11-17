"""Embedding backends (Strategy). One embedder serves RAG, similarity and incidents."""
from __future__ import annotations

import hashlib
from typing import Protocol

import numpy as np


class Embedder(Protocol):
    dim: int
    name: str

    def embed(self, texts: list[str]) -> list[list[float]]: ...


class SentenceTransformerEmbedder:
    """Production embedder: all-MiniLM-L6-v2 (384-d), normalised for cosine search."""

    def __init__(self, model_name: str) -> None:
        from sentence_transformers import SentenceTransformer  # heavy import, load lazily

        self._model = SentenceTransformer(model_name)
        self.dim = int(self._model.get_sentence_embedding_dimension())
        self.name = model_name

    def embed(self, texts: list[str]) -> list[list[float]]:
        vectors = self._model.encode(texts, normalize_embeddings=True, batch_size=32)
        return np.asarray(vectors, dtype=np.float32).tolist()


_STOPWORDS = frozenset(
    "a an the is are was were be been to of in on for and or but with my me i we our you your it this that "
    "at by from as has have had do does did not no so if can could would should will just".split()
)


def _stem(token: str) -> str:
    for suffix in ("ing", "ed", "es", "s"):
        if len(token) > len(suffix) + 2 and token.endswith(suffix):
            return token[: -len(suffix)]
    return token


class HashingEmbedder:
    """Lightweight, dependency-free fallback (feature hashing of word uni/bi-grams).

    Used for CI/tests and machines that cannot download transformer weights.
    It captures lexical (not semantic) similarity, so it is weaker but real.
    """

    def __init__(self, dim: int) -> None:
        self.dim = dim
        self.name = f"hashing-{dim}"

    def _vector(self, text: str) -> np.ndarray:
        vec = np.zeros(self.dim, dtype=np.float32)
        words = "".join(c.lower() if c.isalnum() else " " for c in text).split()
        tokens = [_stem(t) for t in words if len(t) > 1 and t not in _STOPWORDS]
        features = tokens + [f"{a}_{b}" for a, b in zip(tokens, tokens[1:])]
        for feature in features:
            digest = hashlib.md5(feature.encode()).digest()
            index = int.from_bytes(digest[:4], "little") % self.dim
            vec[index] += 1.0 if digest[4] % 2 == 0 else -1.0
        norm = np.linalg.norm(vec)
        return vec / norm if norm > 0 else vec

    def embed(self, texts: list[str]) -> list[list[float]]:
        return [self._vector(t).tolist() for t in texts]


def create_embedder(backend: str, model_name: str, dim: int) -> Embedder:
    if backend == "sentence-transformers":
        embedder = SentenceTransformerEmbedder(model_name)
        if embedder.dim != dim:
            raise ValueError(f"Model dim {embedder.dim} != EMBEDDING_DIM {dim}; update the DB vector size")
        return embedder
    if backend == "hashing":
        return HashingEmbedder(dim)
    raise ValueError(f"Unknown EMBEDDING_BACKEND: {backend}")
