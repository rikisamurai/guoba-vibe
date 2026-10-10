from __future__ import annotations

import json
import math
import re
from collections import defaultdict
from pathlib import Path
from time import perf_counter
from typing import Protocol

from .answering import has_relevant_evidence
from .domain import SearchHit
from .evaluation import evaluate_rankings
from .evidence_matching import evidence_matches_hit

CJK_RE = re.compile(r"[\u3400-\u9fff]")
REQUIRED_GOLD_FIELDS = {"commit", "path", "heading_path", "char_start", "char_end", "text"}


class Retriever(Protocol):
    def search(self, query: str, limit: int = 10) -> list[SearchHit]: ...


def _valid_gold_item(item: object) -> bool:
    if not isinstance(item, dict) or not item.keys() >= REQUIRED_GOLD_FIELDS:
        return False
    start = item["char_start"]
    end = item["char_end"]
    text = item["text"]
    return (
        type(start) is int
        and type(end) is int
        and isinstance(text, str)
        and bool(text)
        and start >= 0
        and end > start
        and end - start == len(text)
    )


def _validate_source_commit(retriever: Retriever, cases: list[dict[str, object]]) -> None:
    actual_commit = getattr(retriever, "source_commit", None)
    if actual_commit is None:
        return
    expected = {
        str(gold["commit"]) for case in cases for gold in case.get("gold", []) if "commit" in gold
    }
    if expected and expected != {actual_commit}:
        raise ValueError(f"Evaluation source commits {sorted(expected)} != index {actual_commit}")


def load_cases(path: Path, approved_only: bool = True) -> list[dict[str, object]]:
    cases: list[dict[str, object]] = []
    paths = sorted(path.glob("*.jsonl")) if path.is_dir() else [path]
    for dataset_path in paths:
        for line_number, line in enumerate(dataset_path.read_text().splitlines(), 1):
            if not line.strip():
                continue
            case = json.loads(line)
            if approved_only and case.get("review_status") != "approved":
                continue
            gold_items = case.get("gold", [])
            answerable = bool(case.get("answerable", True))
            invalid_gold = (
                (answerable and not gold_items)
                or (not answerable and bool(gold_items))
                or any(not _valid_gold_item(item) for item in gold_items)
            )
            if not case.get("question") or invalid_gold:
                location = f"{dataset_path}:{line_number}"
                raise ValueError(f"Invalid evaluation case at {location}")
            cases.append(case)
    return cases


def run_retrieval_evaluation(
    retriever: Retriever,
    dataset: Path,
    limit: int = 10,
    approved_only: bool = True,
) -> dict[str, object]:
    cases = [case for case in load_cases(dataset, approved_only) if case.get("answerable", True)]
    _validate_source_commit(retriever, cases)
    rankings: list[tuple[str, list[str]]] = []
    rankings_by_language: dict[str, list[tuple[str, list[str]]]] = defaultdict(list)
    latencies: list[float] = []
    details: list[dict[str, object]] = []
    for case in cases:
        started = perf_counter()
        hits = retriever.search(str(case["question"]), limit=limit)
        latencies.append((perf_counter() - started) * 1000)
        gold_items = list(case["gold"])
        labels = [
            "gold"
            if any(evidence_matches_hit(gold, hit) for gold in gold_items)
            else hit.chunk.chunk_id
            for hit in hits
        ]
        rankings.append(("gold", labels))
        language = "zh" if CJK_RE.search(str(case["question"])) else "en"
        rankings_by_language[language].append(("gold", labels))
        first_rank = labels.index("gold") + 1 if "gold" in labels else None
        details.append({"id": case.get("id"), "first_relevant_rank": first_rank})
    metrics = evaluate_rankings(rankings, k_values=(1, 5, 10))
    if latencies:
        ordered = sorted(latencies)
        p95_index = max(0, math.ceil(len(ordered) * 0.95) - 1)
        latency = {
            "mean_ms": sum(latencies) / len(latencies),
            "p95_ms": ordered[p95_index],
        }
    else:
        latency = {"mean_ms": 0.0, "p95_ms": 0.0}
    slices = {
        language: evaluate_rankings(items, k_values=(1, 5, 10))
        for language, items in sorted(rankings_by_language.items())
    }
    return {
        "provenance": getattr(retriever, "provenance", {}),
        "metrics": metrics,
        "slices": slices,
        "latency": latency,
        "cases": details,
    }


def run_answerability_evaluation(
    retriever: Retriever,
    dataset: Path,
    limit: int = 10,
) -> dict[str, object]:
    cases = load_cases(dataset, approved_only=True)
    _validate_source_commit(retriever, cases)
    predicted: list[tuple[bool, bool]] = []
    details: list[dict[str, object]] = []
    for case in cases:
        query = str(case["question"])
        hits = retriever.search(query, limit=limit)
        knowledge_base_answerable = bool(case.get("answerable", True))
        retrieval_has_gold = knowledge_base_answerable and any(
            evidence_matches_hit(gold, hit) for gold in case["gold"] for hit in hits
        )
        gate_accepts = has_relevant_evidence(query, hits)
        predicted.append((retrieval_has_gold, gate_accepts))
        outcome = (
            "true_accept"
            if retrieval_has_gold and gate_accepts
            else "false_accept"
            if gate_accepts
            else "false_reject"
            if retrieval_has_gold
            else "true_reject"
        )
        details.append(
            {
                "id": case.get("id"),
                "knowledge_base_answerable": knowledge_base_answerable,
                "retrieval_has_gold": retrieval_has_gold,
                "gate_accepts": gate_accepts,
                "classification": outcome,
                "top_rerank_score": hits[0].rerank_score if hits else None,
                "top_dense_score": hits[0].dense_score if hits else None,
                "top_lexical_score": hits[0].lexical_score if hits else None,
            }
        )
    rejection_tp = sum(not expected and not actual for expected, actual in predicted)
    rejection_fp = sum(expected and not actual for expected, actual in predicted)
    rejection_fn = sum(not expected and actual for expected, actual in predicted)
    precision = rejection_tp / (rejection_tp + rejection_fp) if rejection_tp + rejection_fp else 0.0
    recall = rejection_tp / (rejection_tp + rejection_fn) if rejection_tp + rejection_fn else 0.0
    accuracy = sum(expected == actual for expected, actual in predicted) / (len(predicted) or 1)
    return {
        "provenance": getattr(retriever, "provenance", {}),
        "metrics": {
            "evidence_gate_accuracy": accuracy,
            "rejection_precision": precision,
            "rejection_recall": recall,
            "false_accepts": rejection_fn,
            "false_rejects": rejection_fp,
            "cases": len(predicted),
        },
        "cases": details,
    }
