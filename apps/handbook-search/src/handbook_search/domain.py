from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class SourceConfig:
    name: str
    repository: str
    commit: str
    content_root: str
    public_base_url: str
    content_license: str
    attribution_url: str


@dataclass(frozen=True)
class Page:
    path: str
    title: str
    description: str
    body: str
    url: str


@dataclass(frozen=True)
class Section:
    heading_path: tuple[str, ...]
    body: str
    ordinal: int
    anchor: str = ""


@dataclass(frozen=True)
class Chunk:
    chunk_id: str
    parent_id: str
    page_path: str
    title: str
    heading_path: tuple[str, ...]
    url: str
    ordinal: int
    raw_text: str
    retrieval_text: str
    content_hash: str


@dataclass(frozen=True)
class SearchHit:
    chunk: Chunk
    score: float
    lexical_rank: int | None = None
    dense_rank: int | None = None
    lexical_score: float | None = None
    dense_score: float | None = None
    rerank_score: float | None = None
