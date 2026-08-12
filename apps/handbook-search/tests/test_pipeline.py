from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from threading import Lock
from time import sleep

from handbook_search.answering import (
    Citation,
    ExtractiveAnswerer,
    Qwen3Answerer,
    answer_from_generation,
    citations_from_hits,
)
from handbook_search.chunking import chunk_page, chunk_section
from handbook_search.domain import Page, SearchHit
from handbook_search.embeddings import HashingEmbedder
from handbook_search.markdown import page_url, split_sections
from handbook_search.retrieval import HybridRetriever
from handbook_search.store import IndexStore, build_index


def _page(path: str, title: str, body: str) -> Page:
    return Page(
        path=path,
        title=title,
        description="",
        body=body,
        url=f"https://example.test/{path.removesuffix('.md')}/",
    )


def test_markdown_chunks_keep_heading_context() -> None:
    page = _page(
        "travel.md",
        "Travel policy",
        "Intro text.\n\n## Expense reports\n\nSubmit receipts within thirty days.",
    )

    chunks = chunk_page(page, split_sections(page))

    assert len(chunks) == 2
    assert chunks[1].heading_path == ("Expense reports",)
    assert chunks[1].url.endswith("#expense-reports")
    assert chunks[1].retrieval_text.startswith("Travel policy > Expense reports")


def test_heading_hierarchy_uses_actual_levels_and_explicit_anchor() -> None:
    page = _page(
        "travel.md",
        "Travel policy",
        "## First\n\nOne.\n\n## Second {#custom}\n\nTwo.\n\n### Child\n\nThree.",
    )

    sections = split_sections(page)
    chunks = chunk_page(page, sections)

    assert [section.heading_path for section in sections] == [
        ("First",),
        ("Second",),
        ("Second", "Child"),
    ]
    assert chunks[1].url.endswith("#custom")


def test_root_index_maps_to_handbook_root() -> None:
    assert page_url(Path("_index.md"), "https://example.test/handbook") == (
        "https://example.test/handbook/"
    )


def test_hybrid_retrieval_and_cited_fallback(tmp_path: Path) -> None:
    travel = _page(
        "travel.md",
        "Travel policy",
        "## Expense reports\n\nSubmit receipts within thirty days after travel.",
    )
    security = _page(
        "security.md",
        "Security policy",
        "## Passwords\n\nUse a password manager and multi-factor authentication.",
    )
    chunks = [
        *chunk_page(travel, split_sections(travel)),
        *chunk_page(security, split_sections(security)),
    ]
    embedder = HashingEmbedder()
    build_index(chunks, embedder, tmp_path / "index", "test-commit")
    store = IndexStore(tmp_path / "index")

    hits = HybridRetriever(store, embedder).search("expense receipts", limit=2)
    answer = ExtractiveAnswerer().answer("When do I submit receipts?", hits)

    assert hits[0].chunk.page_path == "travel.md"
    assert answer.status == "evidence_found"
    assert answer.citations[0].url.endswith("#expense-reports")
    assert "thirty days" in answer.text
    store.close()


def test_index_store_supports_parallel_reads(tmp_path: Path) -> None:
    page = _page("travel.md", "Travel policy", "## Receipts\n\nKeep every receipt.")
    chunks = chunk_page(page, split_sections(page))
    embedder = HashingEmbedder()
    build_index(chunks, embedder, tmp_path / "index", "test-commit")
    store = IndexStore(tmp_path / "index")
    retriever = HybridRetriever(store, embedder)

    with ThreadPoolExecutor(max_workers=8) as executor:
        results = list(executor.map(lambda _: retriever.search("receipt"), range(32)))

    assert all(result[0].chunk.page_path == "travel.md" for result in results)
    store.close()


class _SingleFlightEmbedder(HashingEmbedder):
    def __init__(self) -> None:
        super().__init__()
        self._guard = Lock()
        self._active = False

    def embed_query(self, text: str):
        with self._guard:
            if self._active:
                raise RuntimeError("concurrent model inference")
            self._active = True
        try:
            sleep(0.005)
            return super().embed_query(text)
        finally:
            with self._guard:
                self._active = False


def test_retriever_serializes_shared_model_inference(tmp_path: Path) -> None:
    page = _page("travel.md", "Travel policy", "## Receipts\n\nKeep every receipt.")
    chunks = chunk_page(page, split_sections(page))
    embedder = _SingleFlightEmbedder()
    build_index(chunks, embedder, tmp_path / "index", "test-commit")
    store = IndexStore(tmp_path / "index")
    retriever = HybridRetriever(store, embedder)

    with ThreadPoolExecutor(max_workers=4) as executor:
        results = list(executor.map(lambda _: retriever.search("receipt"), range(8)))

    assert all(result for result in results)
    store.close()


class _ReverseReranker:
    name = "reverse-test"

    def score(self, query: str, documents: list[str]):
        del query
        import numpy as np

        return np.arange(len(documents), dtype=np.float32)


def test_reranker_changes_candidate_order(tmp_path: Path) -> None:
    pages = [
        _page(f"page-{index}.md", f"Page {index}", f"## Topic\n\nshared term {index}")
        for index in range(3)
    ]
    chunks = [chunk for page in pages for chunk in chunk_page(page, split_sections(page))]
    embedder = HashingEmbedder()
    build_index(chunks, embedder, tmp_path / "index", "test-commit")
    store = IndexStore(tmp_path / "index")

    baseline = HybridRetriever(store, embedder).search("shared term", limit=3)
    reranked = HybridRetriever(store, embedder, _ReverseReranker()).search("shared term", limit=3)

    assert [hit.chunk.chunk_id for hit in reranked] == [
        hit.chunk.chunk_id for hit in reversed(baseline)
    ]
    store.close()


class _StaticRewriter:
    name = "static-test"

    def __init__(self) -> None:
        self.queries: list[str] = []

    def rewrite(self, query: str) -> str:
        self.queries.append(query)
        return "expense receipts"

    def warm_up(self) -> None:
        pass


def test_query_rewriter_runs_before_retrieval(tmp_path: Path) -> None:
    page = _page("travel.md", "Travel", "## Expenses\n\nKeep expense receipts.")
    chunks = chunk_page(page, split_sections(page))
    embedder = HashingEmbedder()
    build_index(chunks, embedder, tmp_path / "index", "test-commit")
    store = IndexStore(tmp_path / "index")
    rewriter = _StaticRewriter()

    hits = HybridRetriever(store, embedder, query_rewriter=rewriter).search("报销", limit=1)

    assert hits[0].chunk.page_path == "travel.md"
    assert rewriter.queries == ["报销"]
    store.close()


def test_expands_only_neighboring_chunks_from_same_section(tmp_path: Path) -> None:
    page = _page(
        "long.md",
        "Long page",
        "## Process\n\nFirst paragraph.\n\nSecond paragraph.\n\nThird paragraph.",
    )
    sections = split_sections(page)
    chunks = chunk_section(page, sections[0], target_tokens=3, overlap_tokens=0)
    embedder = HashingEmbedder()
    build_index(chunks, embedder, tmp_path / "index", "test-commit")
    store = IndexStore(tmp_path / "index")
    retriever = HybridRetriever(store, embedder)
    hit = SearchHit(chunks[1], 0.03)

    expanded = retriever.expand_hits([hit])

    expected_order = (chunks[1], chunks[0], chunks[2])
    assert expanded[0].chunk.raw_text == "\n\n".join(chunk.raw_text for chunk in expected_order)
    store.close()


def test_extractive_answer_refuses_without_evidence() -> None:
    answer = ExtractiveAnswerer().answer("unknown", [])

    assert answer.status == "not_found"
    assert answer.citations == ()


def test_empty_corpus_is_rejected(tmp_path: Path) -> None:
    try:
        build_index([], HashingEmbedder(), tmp_path / "index", "test-commit")
    except ValueError as error:
        assert "empty corpus" in str(error)
    else:
        raise AssertionError("empty corpus should be rejected")


def test_generated_answer_requires_real_citation_ids() -> None:
    citations = (Citation(1, "Policy", "Scope", "https://example.test", "Evidence"),)

    accepted = answer_from_generation(
        '{"status":"answered","answer":"Use the policy [1]","citations":[1]}',
        citations,
    )
    rejected = answer_from_generation(
        '{"status":"answered","answer":"Unsupported [9]","citations":[9]}',
        citations,
    )
    mixed_ids = answer_from_generation(
        '{"status":"answered","answer":"Supported [1], invented [9]"}',
        citations,
    )
    uncited_claim = answer_from_generation(
        '{"status":"answered","answer":"Supported [1]. Invented statement."}',
        citations,
    )

    assert accepted.status == "answered"
    assert accepted.citations == citations
    assert rejected.status == "not_found"
    assert mixed_ids.status == "not_found"
    assert uncited_claim.status == "not_found"


def test_qwen_answerer_returns_answered_for_valid_generation() -> None:
    class _FakeQwen3Answerer(Qwen3Answerer):
        def __init__(self) -> None:
            pass

        def generate(self, query, hits):
            del query
            return (
                '{"status":"answered","answer":"Use the policy [1]"}',
                citations_from_hits(hits),
            )

    page = _page("policy.md", "Policy", "## Guidance\n\nUse the policy.")
    chunk = chunk_page(page, split_sections(page))[0]
    hit = SearchHit(chunk, 0.03, rerank_score=0.99)

    answer = _FakeQwen3Answerer().answer("What should I use?", [hit])

    assert answer.status == "answered"
    assert answer.citations[0].excerpt == "Use the policy."


def test_compression_keeps_highest_scoring_blocks(tmp_path: Path) -> None:
    page = _page("process.md", "Process", "## Steps\n\nFirst.\n\nSecond.\n\nThird.")
    chunk = chunk_page(page, split_sections(page))[0]
    embedder = HashingEmbedder()
    build_index([chunk], embedder, tmp_path / "index", "test-commit")
    store = IndexStore(tmp_path / "index")
    retriever = HybridRetriever(store, embedder, _ReverseReranker())

    compressed = retriever.compress_hits("third", [SearchHit(chunk, 0.03)], blocks_per_hit=1)

    assert compressed[0].chunk.raw_text == "Third."
    store.close()


def test_search_hit_defaults() -> None:
    page = _page("one.md", "One", "body")
    chunk = chunk_page(page, split_sections(page))[0]

    hit = SearchHit(chunk=chunk, score=0.1)

    assert hit.rerank_score is None
