from __future__ import annotations

from typing import Protocol

from .answering import Answer, ExtractiveAnswerer
from .domain import SearchHit
from .retrieval import HybridRetriever


class Retriever(Protocol):
    def search(self, query: str, limit: int = 10) -> list[SearchHit]: ...


class Answerer(Protocol):
    def answer(self, query: str, hits: list[SearchHit]) -> Answer: ...


def answer_query(
    query: str,
    retriever: Retriever,
    answerer: Answerer,
    limit: int = 10,
) -> Answer:
    hits = retriever.search(query, limit=limit)
    if isinstance(retriever, HybridRetriever) and not isinstance(answerer, ExtractiveAnswerer):
        hits = retriever.compress_hits(query, retriever.expand_hits(hits[:6]))
    return answerer.answer(query, hits)
