from __future__ import annotations

import json
from pathlib import Path

import pytest

from handbook_search.domain import Chunk, SearchHit
from handbook_search.evaluation_runner import (
    load_cases,
    run_answerability_evaluation,
    run_retrieval_evaluation,
)


class _Retriever:
    source_commit = "test-commit"
    provenance = {"source_commit": source_commit, "embedding_model": "test"}

    def search(self, query: str, limit: int = 10) -> list[SearchHit]:
        del query, limit
        chunk = Chunk(
            chunk_id="chunk-1",
            parent_id="parent-1",
            page_path="people/time-off.md",
            title="Time off",
            heading_path=("Requesting time off",),
            url="https://example.test/time-off/#requesting-time-off",
            ordinal=0,
            raw_text="Notify your manager before taking planned time off.",
            retrieval_text="Time off > Requesting time off\nNotify your manager.",
            content_hash="hash",
        )
        return [SearchHit(chunk, 0.03, lexical_rank=1)]


class _HighScoreWrongRetriever(_Retriever):
    def search(self, query: str, limit: int = 10) -> list[SearchHit]:
        del query, limit
        chunk = Chunk(
            chunk_id="wrong-chunk",
            parent_id="wrong-parent",
            page_path="people/time-off.md",
            title="Time off",
            heading_path=("A different section",),
            url="https://example.test/time-off/#different",
            ordinal=0,
            raw_text="A related passage that does not contain the reviewed answer.",
            retrieval_text="Time off > A different section\nRelated passage.",
            content_hash="wrong-hash",
        )
        return [SearchHit(chunk, 0.03, rerank_score=0.99)]


class _IncompleteEngineeringRetriever(_HighScoreWrongRetriever):
    source_commit = "eb7f028cc25d3dd8cdfbe7b0b4f834c79a64d7cb"

    def search(self, query: str, limit: int = 10) -> list[SearchHit]:
        del query, limit
        chunk = Chunk(
            chunk_id="engineering-partial",
            parent_id="engineering-partial-parent",
            page_path="engineering/infrastructure-platforms/tenant-scale/organizations/dri.md",
            title="Organizations DRI",
            heading_path=("Responsibilities",),
            url="https://example.test/organizations-dri/#responsibilities",
            ordinal=0,
            raw_text="Write a weekly update on Monday.",
            retrieval_text="Organizations DRI > Responsibilities\nWrite a weekly update on Monday.",
            content_hash="engineering-partial-hash",
        )
        return [SearchHit(chunk, 0.03, rerank_score=0.99)]


def _record(status: str = "approved") -> dict[str, object]:
    return {
        "id": "case-1",
        "question": "Who should I notify?",
        "review_status": status,
        "gold": [
            {
                "commit": "test-commit",
                "path": "people/time-off.md",
                "heading_path": ["Requesting time off"],
                "char_start": 0,
                "char_end": 51,
                "text": "Notify your manager before taking planned time off.",
            }
        ],
    }


def _write(path: Path, record: dict[str, object]) -> None:
    path.write_text(json.dumps(record) + "\n")


def test_loads_all_reviewed_slices_from_directory(tmp_path: Path) -> None:
    _write(tmp_path / "a.jsonl", _record())
    _write(tmp_path / "b.jsonl", {**_record(), "id": "case-2"})

    assert [case["id"] for case in load_cases(tmp_path)] == ["case-1", "case-2"]


def test_unreviewed_candidates_are_excluded_by_default(tmp_path: Path) -> None:
    dataset = tmp_path / "candidate.jsonl"
    _write(dataset, _record("candidate"))

    assert load_cases(dataset) == []
    assert len(load_cases(dataset, approved_only=False)) == 1


def test_rejects_invalid_gold_span(tmp_path: Path) -> None:
    dataset = tmp_path / "approved.jsonl"
    record = _record()
    record["gold"][0]["char_end"] = 10
    _write(dataset, record)

    with pytest.raises(ValueError, match="Invalid evaluation case"):
        load_cases(dataset)


def test_rejects_no_answer_case_with_gold_evidence(tmp_path: Path) -> None:
    dataset = tmp_path / "no-answer.jsonl"
    _write(dataset, {**_record(), "answerable": False})

    with pytest.raises(ValueError, match="Invalid evaluation case"):
        load_cases(dataset)


def test_runs_retrieval_metrics_against_canonical_evidence(tmp_path: Path) -> None:
    dataset = tmp_path / "approved.jsonl"
    _write(dataset, _record())

    result = run_retrieval_evaluation(_Retriever(), dataset)

    assert result["metrics"]["recall@1"] == 1.0
    assert result["metrics"]["mrr"] == 1.0
    assert result["slices"]["en"]["cases"] == 1
    assert result["latency"]["mean_ms"] >= 0


def test_relevance_requires_evidence_text_not_only_page_and_heading(tmp_path: Path) -> None:
    dataset = tmp_path / "approved.jsonl"
    record = _record()
    record["gold"][0]["text"] = (
        "A completely unrelated policy passage with enough words to be distinct."
    )
    record["gold"][0]["char_end"] = 71
    _write(dataset, record)

    result = run_retrieval_evaluation(_Retriever(), dataset)

    assert result["metrics"]["recall@1"] == 0.0


def test_relevance_requires_matching_heading_path(tmp_path: Path) -> None:
    dataset = tmp_path / "approved.jsonl"
    record = _record()
    record["gold"][0]["heading_path"] = ["A different section"]
    _write(dataset, record)

    result = run_retrieval_evaluation(_Retriever(), dataset)

    assert result["metrics"]["recall@1"] == 0.0


def test_rejects_dataset_from_a_different_source_commit(tmp_path: Path) -> None:
    dataset = tmp_path / "approved.jsonl"
    record = _record()
    record["gold"][0]["commit"] = "wrong-commit"
    _write(dataset, record)

    with pytest.raises(ValueError, match="source commits"):
        run_retrieval_evaluation(_Retriever(), dataset)


def test_evidence_gate_rejects_approved_no_answer_case(tmp_path: Path) -> None:
    dataset = tmp_path / "no-answer.jsonl"
    record = {
        "id": "no-answer-1",
        "question": "What is the future office address?",
        "review_status": "approved",
        "answerable": False,
        "gold": [],
    }
    _write(dataset, record)

    result = run_answerability_evaluation(_Retriever(), dataset)

    assert result["metrics"]["rejection_precision"] == 1.0
    assert result["metrics"]["rejection_recall"] == 1.0
    assert result["cases"][0]["classification"] == "true_reject"


def test_evidence_gate_accepts_relevant_gold_hit(tmp_path: Path) -> None:
    dataset = tmp_path / "approved.jsonl"
    _write(dataset, _record())

    result = run_answerability_evaluation(_Retriever(), dataset)

    assert result["metrics"]["evidence_gate_accuracy"] == 1.0
    assert result["cases"][0]["classification"] == "true_accept"


def test_evidence_gate_rejects_high_score_without_gold_hit(tmp_path: Path) -> None:
    dataset = tmp_path / "approved.jsonl"
    _write(dataset, _record())

    result = run_answerability_evaluation(_HighScoreWrongRetriever(), dataset)

    assert result["metrics"]["evidence_gate_accuracy"] == 0.0
    assert result["metrics"]["false_accepts"] == 1
    assert result["metrics"]["false_rejects"] == 0
    assert result["cases"][0]["retrieval_has_gold"] is False
    assert result["cases"][0]["gate_accepts"] is True
    assert result["cases"][0]["classification"] == "false_accept"


def test_incomplete_engineering_evidence_is_not_counted_as_a_correct_answer(
    tmp_path: Path,
) -> None:
    reviewed = Path(__file__).parents[1] / "eval/reviewed/engineering.jsonl"
    case = next(
        json.loads(line)
        for line in reviewed.read_text().splitlines()
        if json.loads(line)["id"] == "engineering-en-003"
    )
    dataset = tmp_path / "engineering-en-003.jsonl"
    _write(dataset, case)

    result = run_answerability_evaluation(_IncompleteEngineeringRetriever(), dataset)

    assert result["metrics"]["evidence_gate_accuracy"] == 0.0
    assert result["cases"][0]["id"] == "engineering-en-003"
    assert result["cases"][0]["retrieval_has_gold"] is False
    assert result["cases"][0]["gate_accepts"] is True
    assert result["cases"][0]["classification"] == "false_accept"
