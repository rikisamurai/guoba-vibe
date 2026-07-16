from __future__ import annotations

import json
import math

import pytest

from handbook_search.domain import Page
from handbook_search.evaluation import (
    evaluate_rankings,
    generate_candidates,
    is_question_heading,
    ndcg_at_k,
    recall_at_k,
    reciprocal_rank,
    write_candidates_jsonl,
)


def _page() -> Page:
    return Page(
        path="people/time-off.md",
        title="Time off",
        description="",
        url="https://handbook.gitlab.com/handbook/people/time-off/",
        body="""# Time off

Introductory text that should not become a question.

```md
## How do I avoid treating code as a heading?
This is an example, not handbook evidence.
```

## How do I request time off?

Use PTO by Roots and notify your manager before the absence.

### Special cases

Follow the local policy when statutory rules differ.

## Overview

This ordinary section must not become a candidate.

## What happens after approval

Your manager receives a confirmation and the calendar is updated.

## Empty question?

Tiny.
""",
    )


def test_generates_candidates_with_stable_source_spans() -> None:
    page = _page()
    candidates = list(generate_candidates([page], commit="abc123", min_evidence_chars=20))

    assert [item.question for item in candidates] == [
        "How do I request time off?",
        "What happens after approval?",
    ]
    first = candidates[0]
    assert first.gold.path == "people/time-off.md"
    assert first.gold.heading_path == ("Time off", "How do I request time off?")
    assert "### Special cases" in first.gold.text
    assert page.body[first.gold.char_start : first.gold.char_end] == first.gold.text
    assert (
        first.candidate_id
        == list(generate_candidates([page], commit="abc123", min_evidence_chars=20))[0].candidate_id
    )


def test_candidate_ids_are_snapshot_specific() -> None:
    page = _page()
    old = list(generate_candidates([page], commit="old", min_evidence_chars=20))[0]
    new = list(generate_candidates([page], commit="new", min_evidence_chars=20))[0]

    assert old.candidate_id != new.candidate_id
    assert old.gold.key.startswith("old:people/time-off.md#Time off > How do I request time off?@")


def test_writes_reviewable_jsonl(tmp_path) -> None:
    candidates = generate_candidates([_page()], commit="abc123", min_evidence_chars=20)
    output = tmp_path / "candidates.jsonl"

    assert write_candidates_jsonl(candidates, output) == 2
    records = [json.loads(line) for line in output.read_text().splitlines()]
    assert records[0]["gold"][0]["commit"] == "abc123"
    assert records[0]["gold"][0]["heading_path"] == [
        "Time off",
        "How do I request time off?",
    ]
    assert records[0]["gold"][0]["text"].startswith("Use PTO")


@pytest.mark.parametrize(
    ("heading", "expected"),
    [
        ("How to edit the handbook", True),
        ("[What is GitLab?](https://example.com)", True),
        ("Overview", False),
    ],
)
def test_question_heading_detection(heading: str, expected: bool) -> None:
    assert is_question_heading(heading) is expected


def test_single_evidence_metrics() -> None:
    assert recall_at_k("gold", ["wrong", "gold"], 1) == 0
    assert recall_at_k("gold", ["wrong", "gold"], 2) == 1
    assert reciprocal_rank("gold", ["wrong", "gold"]) == 0.5
    assert ndcg_at_k("gold", ["wrong", "gold"], 2) == pytest.approx(1 / math.log2(3))


def test_aggregates_retrieval_metrics() -> None:
    metrics = evaluate_rankings(
        [
            ("a", ["x", "a"]),
            ("b", ["b", "y"]),
            ("c", ["x", "y"]),
        ],
        k_values=(1, 2),
    )

    assert metrics["recall@1"] == pytest.approx(1 / 3)
    assert metrics["recall@2"] == pytest.approx(2 / 3)
    assert metrics["mrr"] == pytest.approx(0.5)
    assert metrics["ndcg@2"] == pytest.approx((1 / math.log2(3) + 1) / 3)
    assert metrics["cases"] == 3


def test_metrics_validate_k_and_handle_no_cases() -> None:
    with pytest.raises(ValueError, match="positive"):
        recall_at_k("gold", [], 0)
    assert evaluate_rankings([], k_values=(1,)) == {
        "recall@1": 0,
        "ndcg@1": 0,
        "mrr": 0,
        "cases": 0,
    }
