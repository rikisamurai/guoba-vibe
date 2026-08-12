from __future__ import annotations

import re
from collections import defaultdict
from dataclasses import replace
from threading import Lock

from .domain import SearchHit
from .embeddings import Embedder
from .query_rewriting import QueryRewriter
from .reranking import Reranker
from .store import IndexStore


class HybridRetriever:
    def __init__(
        self,
        store: IndexStore,
        embedder: Embedder,
        reranker: Reranker | None = None,
        rrf_constant: int = 60,
        query_rewriter: QueryRewriter | None = None,
    ) -> None:
        expected_model = store.meta["embedding_model"]
        if expected_model != embedder.name:
            raise ValueError(f"Index uses {expected_model}, query uses {embedder.name}")
        self.store = store
        self.embedder = embedder
        self.reranker = reranker
        self.rrf_constant = rrf_constant
        self.query_rewriter = query_rewriter
        self._embedding_lock = Lock()
        self._reranker_lock = Lock()

    @property
    def source_commit(self) -> str:
        return str(self.store.meta["source_commit"])

    @property
    def provenance(self) -> dict[str, object]:
        return {
            **self.store.meta,
            "reranker": self.reranker.name if self.reranker else None,
            "query_rewriter": (
                self.query_rewriter.name if self.query_rewriter is not None else None
            ),
        }

    def warm_up(self) -> None:
        if self.query_rewriter is not None:
            self.query_rewriter.warm_up()

    def _retrieval_query(self, query: str) -> str:
        if self.query_rewriter is None:
            return query
        return self.query_rewriter.rewrite(query)

    def search(
        self,
        query: str,
        limit: int = 10,
        candidate_limit: int = 80,
        rerank_limit: int = 40,
        max_per_page: int = 2,
    ) -> list[SearchHit]:
        retrieval_query = self._retrieval_query(query)
        lexical = self.store.lexical_search(retrieval_query, candidate_limit)
        with self._embedding_lock:
            query_vector = self.embedder.embed_query(retrieval_query)
        dense = self.store.dense_search(query_vector, candidate_limit)
        lexical_ranks = {chunk_id: rank for rank, (chunk_id, _) in enumerate(lexical, 1)}
        dense_ranks = {chunk_id: rank for rank, (chunk_id, _) in enumerate(dense, 1)}
        lexical_scores = dict(lexical)
        dense_scores = dict(dense)
        scores: dict[str, float] = defaultdict(float)
        for rankings in (lexical_ranks, dense_ranks):
            for chunk_id, rank in rankings.items():
                scores[chunk_id] += 1 / (self.rrf_constant + rank)
        ranked_ids = sorted(scores, key=lambda chunk_id: scores[chunk_id], reverse=True)
        candidates = [
            SearchHit(
                chunk=self.store.get_chunk(chunk_id),
                score=scores[chunk_id],
                lexical_rank=lexical_ranks.get(chunk_id),
                dense_rank=dense_ranks.get(chunk_id),
                lexical_score=lexical_scores.get(chunk_id),
                dense_score=dense_scores.get(chunk_id),
            )
            for chunk_id in ranked_ids[: max(limit, rerank_limit)]
        ]
        if self.reranker and candidates:
            with self._reranker_lock:
                rerank_scores = self.reranker.score(
                    retrieval_query,
                    [candidate.chunk.retrieval_text for candidate in candidates],
                )
            candidates = sorted(
                (
                    replace(candidate, rerank_score=float(rerank_score))
                    for candidate, rerank_score in zip(candidates, rerank_scores, strict=True)
                ),
                key=lambda candidate: candidate.rerank_score or 0.0,
                reverse=True,
            )
        hits: list[SearchHit] = []
        page_counts: dict[str, int] = defaultdict(int)
        for candidate in candidates:
            chunk = candidate.chunk
            if page_counts[chunk.page_path] >= max_per_page:
                continue
            page_counts[chunk.page_path] += 1
            hits.append(candidate)
            if len(hits) == limit:
                break
        return hits

    def expand_hits(
        self,
        hits: list[SearchHit],
        neighbor_window: int = 1,
        max_chars: int = 8_000,
    ) -> list[SearchHit]:
        expanded: list[SearchHit] = []
        for hit in hits:
            siblings = self.store.get_parent_chunks(hit.chunk.parent_id)
            selected = sorted(
                (
                    sibling
                    for sibling in siblings
                    if abs(sibling.ordinal - hit.chunk.ordinal) <= neighbor_window
                ),
                key=lambda sibling: (abs(sibling.ordinal - hit.chunk.ordinal), sibling.ordinal),
            )
            texts: list[str] = []
            for sibling in selected:
                if sibling.raw_text not in texts:
                    texts.append(sibling.raw_text)
            raw_text = "\n\n".join(texts)[:max_chars]
            expanded.append(replace(hit, chunk=replace(hit.chunk, raw_text=raw_text)))
        return expanded

    def compress_hits(
        self,
        query: str,
        hits: list[SearchHit],
        blocks_per_hit: int = 3,
    ) -> list[SearchHit]:
        if self.reranker is None:
            return hits
        compressed: list[SearchHit] = []
        retrieval_query = self._retrieval_query(query)
        for hit in hits:
            blocks = [block.strip() for block in re.split(r"\n\s*\n", hit.chunk.raw_text)]
            blocks = [block for block in blocks if block]
            if len(blocks) <= blocks_per_hit:
                compressed.append(hit)
                continue
            with self._reranker_lock:
                scores = self.reranker.score(retrieval_query, blocks)
            indexes = sorted(range(len(blocks)), key=lambda index: scores[index], reverse=True)
            raw_text = "\n\n".join(blocks[index] for index in indexes[:blocks_per_hit])
            compressed.append(replace(hit, chunk=replace(hit.chunk, raw_text=raw_text)))
        return compressed
