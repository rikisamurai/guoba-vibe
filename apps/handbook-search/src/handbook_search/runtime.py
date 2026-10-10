from __future__ import annotations

from pathlib import Path

from .embeddings import create_embedder
from .query_rewriting import create_query_rewriter
from .reranking import create_reranker
from .retrieval import HybridRetriever
from .store import IndexStore

MODEL_NAMES = {
    "hashing-v1": "hashing",
    "Qwen/Qwen3-Embedding-0.6B": "qwen3",
    "intfloat/multilingual-e5-small": "e5-small",
}


def open_retriever(
    index_dir: Path,
    embedder_name: str = "auto",
    reranker_name: str = "minilm",
    query_rewriter_name: str = "zh-en",
) -> HybridRetriever:
    store = IndexStore(index_dir)
    if embedder_name == "auto":
        try:
            embedder_name = MODEL_NAMES[store.meta["embedding_model"]]
        except KeyError:
            store.close()
            raise ValueError("Unknown embedding model in index metadata") from None
    try:
        return HybridRetriever(
            store,
            create_embedder(embedder_name),
            create_reranker(reranker_name),
            query_rewriter=create_query_rewriter(query_rewriter_name),
        )
    except Exception:
        store.close()
        raise
