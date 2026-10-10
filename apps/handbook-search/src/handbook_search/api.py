from __future__ import annotations

import os
from threading import Lock
from typing import Protocol

from fastapi import FastAPI, Request
from pydantic import BaseModel, Field, field_validator

from .answering import Answer, AnswerStatus, create_answerer
from .config import DEFAULT_INDEX_DIR
from .domain import SearchHit
from .retrieval import HybridRetriever
from .runtime import open_retriever
from .service import answer_query


class Retriever(Protocol):
    def search(self, query: str, limit: int = 10) -> list[SearchHit]: ...


class Answerer(Protocol):
    def answer(self, query: str, hits: list[SearchHit]) -> Answer: ...


class SearchRequest(BaseModel):
    query: str = Field(min_length=1)
    limit: int = Field(default=10, ge=1, le=50)

    @field_validator("query")
    @classmethod
    def query_must_not_be_blank(cls, query: str) -> str:
        query = query.strip()
        if not query:
            raise ValueError("query must not be blank")
        return query


class HitResponse(BaseModel):
    chunk_id: str
    title: str
    heading_path: list[str]
    url: str
    raw_text: str
    score: float
    lexical_rank: int | None
    dense_rank: int | None
    lexical_score: float | None
    dense_score: float | None
    rerank_score: float | None


class SearchResponse(BaseModel):
    query: str
    hits: list[HitResponse]


class CitationResponse(BaseModel):
    id: int
    title: str
    heading: str
    url: str
    excerpt: str


class AnswerResponse(BaseModel):
    query: str
    status: AnswerStatus
    text: str
    citations: list[CitationResponse]


def _create_default_retriever() -> HybridRetriever:
    return open_retriever(
        DEFAULT_INDEX_DIR,
        reranker_name=os.getenv("HANDBOOK_RERANKER", "minilm"),
        query_rewriter_name=os.getenv("HANDBOOK_QUERY_REWRITER", "zh-en"),
    )


def _hit_response(hit: SearchHit) -> HitResponse:
    return HitResponse(
        chunk_id=hit.chunk.chunk_id,
        title=hit.chunk.title,
        heading_path=list(hit.chunk.heading_path),
        url=hit.chunk.url,
        raw_text=hit.chunk.raw_text,
        score=hit.score,
        lexical_rank=hit.lexical_rank,
        dense_rank=hit.dense_rank,
        lexical_score=hit.lexical_score,
        dense_score=hit.dense_score,
        rerank_score=hit.rerank_score,
    )


def create_app(
    retriever: Retriever | None = None,
    answerer: Answerer | None = None,
) -> FastAPI:
    app = FastAPI(title="Handbook Search", version="0.1.0")
    app.state.retriever = retriever
    app.state.answerer = answerer
    app.state.load_lock = Lock()

    def active_retriever(request: Request) -> Retriever:
        if request.app.state.retriever is None:
            with request.app.state.load_lock:
                if request.app.state.retriever is None:
                    request.app.state.retriever = _create_default_retriever()
        return request.app.state.retriever

    def active_answerer(request: Request) -> Answerer:
        if request.app.state.answerer is None:
            with request.app.state.load_lock:
                if request.app.state.answerer is None:
                    name = os.getenv("HANDBOOK_ANSWERER", "extractive")
                    request.app.state.answerer = create_answerer(name)
        return request.app.state.answerer

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.post("/search", response_model=SearchResponse)
    def search(payload: SearchRequest, request: Request) -> SearchResponse:
        hits = active_retriever(request).search(payload.query, limit=payload.limit)
        return SearchResponse(query=payload.query, hits=[_hit_response(hit) for hit in hits])

    @app.post("/answer", response_model=AnswerResponse)
    def answer(payload: SearchRequest, request: Request) -> AnswerResponse:
        result = answer_query(
            payload.query,
            active_retriever(request),
            active_answerer(request),
            payload.limit,
        )
        return AnswerResponse(query=payload.query, **result.to_dict())

    return app


app = create_app()
