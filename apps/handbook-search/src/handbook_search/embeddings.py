from __future__ import annotations

import hashlib
import re
from typing import Protocol

import numpy as np

WORD_RE = re.compile(r"\w+", re.UNICODE)


class Embedder(Protocol):
    name: str

    def embed_documents(self, texts: list[str]) -> np.ndarray: ...

    def embed_query(self, text: str) -> np.ndarray: ...


class HashingEmbedder:
    """Small deterministic embedder for tests and pipeline smoke checks."""

    name = "hashing-v1"

    def __init__(self, dimensions: int = 384) -> None:
        self.dimensions = dimensions

    def _embed(self, text: str) -> np.ndarray:
        words = [word.lower() for word in WORD_RE.findall(text)]
        features = words + [
            f"{left}::{right}" for left, right in zip(words, words[1:], strict=False)
        ]
        vector = np.zeros(self.dimensions, dtype=np.float32)
        for feature in features:
            digest = hashlib.blake2b(feature.encode(), digest_size=8).digest()
            value = int.from_bytes(digest)
            index = value % self.dimensions
            vector[index] += 1.0 if value & 1 else -1.0
        norm = np.linalg.norm(vector)
        return vector / norm if norm else vector

    def embed_documents(self, texts: list[str]) -> np.ndarray:
        return np.stack([self._embed(text) for text in texts])

    def embed_query(self, text: str) -> np.ndarray:
        return self._embed(text)


class Qwen3Embedder:
    name = "Qwen/Qwen3-Embedding-0.6B"

    def __init__(self, batch_size: int = 32) -> None:
        try:
            import torch
            from sentence_transformers import SentenceTransformer
        except ImportError as error:
            raise RuntimeError("Install model dependencies with: uv sync --extra models") from error
        device = "mps" if torch.backends.mps.is_available() else "cpu"
        self.batch_size = batch_size
        self.model = SentenceTransformer(self.name, device=device)
        self.model.max_seq_length = 1024

    def embed_documents(self, texts: list[str]) -> np.ndarray:
        return self.model.encode(
            texts,
            batch_size=self.batch_size,
            normalize_embeddings=True,
            convert_to_numpy=True,
            show_progress_bar=True,
        ).astype(np.float32)

    def embed_query(self, text: str) -> np.ndarray:
        vector = self.model.encode(
            [text],
            prompt_name="query",
            normalize_embeddings=True,
            convert_to_numpy=True,
        )[0]
        return vector.astype(np.float32)


class E5SmallEmbedder:
    """Fast multilingual profile for indexing the complete handbook locally."""

    name = "intfloat/multilingual-e5-small"

    def __init__(self, batch_size: int = 64) -> None:
        try:
            import torch
            from sentence_transformers import SentenceTransformer
        except ImportError as error:
            raise RuntimeError("Install model dependencies with: uv sync --extra models") from error
        device = "mps" if torch.backends.mps.is_available() else "cpu"
        self.batch_size = batch_size
        self.model = SentenceTransformer(self.name, device=device)
        self.model.max_seq_length = 512

    def _encode(self, texts: list[str], prefix: str, progress: bool) -> np.ndarray:
        return self.model.encode(
            [f"{prefix}: {text}" for text in texts],
            batch_size=self.batch_size,
            normalize_embeddings=True,
            convert_to_numpy=True,
            show_progress_bar=progress,
        ).astype(np.float32)

    def embed_documents(self, texts: list[str]) -> np.ndarray:
        return self._encode(texts, "passage", True)

    def embed_query(self, text: str) -> np.ndarray:
        return self._encode([text], "query", False)[0]


def create_embedder(name: str) -> Embedder:
    if name == "hashing":
        return HashingEmbedder()
    if name == "qwen3":
        return Qwen3Embedder()
    if name == "e5-small":
        return E5SmallEmbedder()
    raise ValueError(f"Unknown embedding model: {name}")
