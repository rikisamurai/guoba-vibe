from __future__ import annotations

import hashlib
import json
import math
import re
from collections.abc import Iterable, Iterator, Sequence
from dataclasses import dataclass
from pathlib import Path

from .domain import Page

HEADING_RE = re.compile(r"^(#{1,6})\s+(.+?)\s*$", re.MULTILINE)
QUESTION_RE = re.compile(
    r"^(what|why|how|when|where|who|which|can|could|should|would|do|does|did|is|are|will)\b",
    re.IGNORECASE,
)
MARKDOWN_LINK_RE = re.compile(r"\[([^]]+)]\([^)]*\)")


@dataclass(frozen=True)
class GoldEvidence:
    commit: str
    path: str
    url: str
    heading_path: tuple[str, ...]
    char_start: int
    char_end: int
    text: str

    @property
    def key(self) -> str:
        heading = " > ".join(self.heading_path)
        return f"{self.commit}:{self.path}#{heading}@{self.char_start}:{self.char_end}"

    def to_dict(self) -> dict[str, object]:
        return {
            "commit": self.commit,
            "path": self.path,
            "url": self.url,
            "heading_path": list(self.heading_path),
            "char_start": self.char_start,
            "char_end": self.char_end,
            "text": self.text,
            "offset_basis": "markdown_body_after_frontmatter",
        }


@dataclass(frozen=True)
class EvaluationCandidate:
    candidate_id: str
    question: str
    gold: GoldEvidence

    def to_dict(self) -> dict[str, object]:
        return {
            "id": self.candidate_id,
            "question": self.question,
            "gold": [self.gold.to_dict()],
            "review_status": "candidate",
        }


@dataclass(frozen=True)
class _Heading:
    level: int
    text: str
    start: int
    end: int


def _clean_heading(value: str) -> str:
    value = re.sub(r"\s+#+$", "", value)
    value = MARKDOWN_LINK_RE.sub(r"\1", value)
    return re.sub(r"[*_`]", "", value).strip()


def is_question_heading(heading: str) -> bool:
    heading = _clean_heading(heading)
    return heading.endswith("?") or bool(QUESTION_RE.match(heading))


def _question_from_heading(heading: str) -> str:
    heading = _clean_heading(heading)
    return heading if heading.endswith("?") else f"{heading}?"


def _trimmed_span(text: str, start: int, end: int) -> tuple[int, int]:
    while start < end and text[start].isspace():
        start += 1
    while end > start and text[end - 1].isspace():
        end -= 1
    return start, end


def _headings(body: str) -> list[_Heading]:
    headings: list[_Heading] = []
    offset = 0
    in_fence = False
    for line in body.splitlines(keepends=True):
        stripped = line.lstrip()
        if stripped.startswith(("```", "~~~")):
            in_fence = not in_fence
        elif not in_fence and (match := HEADING_RE.match(line)):
            headings.append(
                _Heading(
                    level=len(match.group(1)),
                    text=match.group(2),
                    start=offset + match.start(),
                    end=offset + match.end(),
                )
            )
        offset += len(line)
    return headings


def generate_candidates(
    pages: Iterable[Page], commit: str, min_evidence_chars: int = 40
) -> Iterator[EvaluationCandidate]:
    for page in pages:
        matches = _headings(page.body)
        stack: list[tuple[int, str]] = []
        for index, match in enumerate(matches):
            level = match.level
            heading = _clean_heading(match.text)
            while stack and stack[-1][0] >= level:
                stack.pop()
            heading_path = tuple(item[1] for item in stack) + (heading,)
            stack.append((level, heading))
            if not is_question_heading(heading):
                continue
            end = len(page.body)
            for next_match in matches[index + 1 :]:
                if next_match.level <= level:
                    end = next_match.start
                    break
            start, end = _trimmed_span(page.body, match.end, end)
            if end - start < min_evidence_chars:
                continue
            evidence = GoldEvidence(
                commit=commit,
                path=page.path,
                url=page.url,
                heading_path=heading_path,
                char_start=start,
                char_end=end,
                text=page.body[start:end],
            )
            identity = f"{commit}\0{page.path}\0{heading_path}\0{start}:{end}"
            candidate_id = hashlib.sha256(identity.encode()).hexdigest()[:20]
            yield EvaluationCandidate(candidate_id, _question_from_heading(heading), evidence)


def write_candidates_jsonl(candidates: Iterable[EvaluationCandidate], output: Path) -> int:
    output.parent.mkdir(parents=True, exist_ok=True)
    count = 0
    with output.open("w", encoding="utf-8") as handle:
        for candidate in candidates:
            handle.write(json.dumps(candidate.to_dict(), ensure_ascii=False) + "\n")
            count += 1
    return count


def recall_at_k(gold_id: str, retrieved_ids: Sequence[str], k: int) -> float:
    if k < 1:
        raise ValueError("k must be positive")
    return float(gold_id in retrieved_ids[:k])


def reciprocal_rank(gold_id: str, retrieved_ids: Sequence[str]) -> float:
    try:
        return 1.0 / (retrieved_ids.index(gold_id) + 1)
    except ValueError:
        return 0.0


def ndcg_at_k(gold_id: str, retrieved_ids: Sequence[str], k: int) -> float:
    if k < 1:
        raise ValueError("k must be positive")
    try:
        rank = retrieved_ids[:k].index(gold_id) + 1
    except ValueError:
        return 0.0
    return 1.0 / math.log2(rank + 1)


def evaluate_rankings(
    rankings: Iterable[tuple[str, Sequence[str]]],
    k_values: Sequence[int] = (1, 5, 10),
) -> dict[str, float]:
    cases = list(rankings)
    metrics: dict[str, float] = {}
    denominator = len(cases) or 1
    for k in k_values:
        metrics[f"recall@{k}"] = sum(recall_at_k(g, r, k) for g, r in cases) / denominator
        metrics[f"ndcg@{k}"] = sum(ndcg_at_k(g, r, k) for g, r in cases) / denominator
    metrics["mrr"] = sum(reciprocal_rank(g, r) for g, r in cases) / denominator
    metrics["cases"] = float(len(cases))
    return metrics
