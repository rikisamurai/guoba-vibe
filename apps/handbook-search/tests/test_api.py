from fastapi.testclient import TestClient

from handbook_search.api import create_app
from handbook_search.domain import Chunk, SearchHit


class FakeRetriever:
    def __init__(self) -> None:
        self.calls: list[tuple[str, int]] = []

    def search(self, query: str, limit: int = 10) -> list[SearchHit]:
        self.calls.append((query, limit))
        chunk = Chunk(
            chunk_id="chunk-1",
            parent_id="section-1",
            page_path="people-group/paid-time-off.md",
            title="Paid time off",
            heading_path=("Taking time off",),
            url="https://handbook.gitlab.com/handbook/people-group/paid-time-off/",
            ordinal=0,
            raw_text="Team members should communicate planned time off.",
            retrieval_text="Paid time off > Taking time off\nTeam members should communicate.",
            content_hash="hash-1",
        )
        return [SearchHit(chunk=chunk, score=0.031, lexical_rank=1, dense_rank=3)]


def test_health() -> None:
    client = TestClient(create_app(FakeRetriever()))

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_search_returns_cited_raw_hit() -> None:
    retriever = FakeRetriever()
    client = TestClient(create_app(retriever))

    response = client.post("/search", json={"query": "How do I take time off?", "limit": 4})

    assert response.status_code == 200
    assert retriever.calls == [("How do I take time off?", 4)]
    assert response.json() == {
        "query": "How do I take time off?",
        "hits": [
            {
                "chunk_id": "chunk-1",
                "title": "Paid time off",
                "heading_path": ["Taking time off"],
                "url": "https://handbook.gitlab.com/handbook/people-group/paid-time-off/",
                "raw_text": "Team members should communicate planned time off.",
                "score": 0.031,
                "lexical_rank": 1,
                "dense_rank": 3,
                "lexical_score": None,
                "dense_score": None,
                "rerank_score": None,
            }
        ],
    }


def test_search_validates_query_and_limit() -> None:
    client = TestClient(create_app(FakeRetriever()))

    assert client.post("/search", json={"query": "", "limit": 5}).status_code == 422
    assert client.post("/search", json={"query": "   ", "limit": 5}).status_code == 422
    assert client.post("/search", json={"query": "time off", "limit": 0}).status_code == 422


def test_answer_uses_injected_evidence() -> None:
    client = TestClient(create_app(FakeRetriever()))

    response = client.post("/answer", json={"query": "planned time off", "limit": 3})

    assert response.status_code == 200
    assert response.json()["status"] == "evidence_found"
    assert response.json()["citations"][0]["title"] == "Paid time off"
