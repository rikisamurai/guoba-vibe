from __future__ import annotations

import json
import re
from dataclasses import asdict, dataclass
from threading import Lock
from typing import Literal

from .domain import SearchHit

AnswerStatus = Literal["evidence_found", "answered", "not_found"]


@dataclass(frozen=True)
class Citation:
    id: int
    title: str
    heading: str
    url: str
    excerpt: str


@dataclass(frozen=True)
class Answer:
    status: AnswerStatus
    text: str
    citations: tuple[Citation, ...]

    def to_dict(self) -> dict[str, object]:
        return asdict(self)


WORD_RE = re.compile(r"\w+", re.UNICODE)
CJK_RE = re.compile(r"[\u3400-\u9fff]")


def not_found_text(query: str) -> str:
    if CJK_RE.search(query):
        return "知识库中没有足够信息，无法可靠回答。"
    return "The knowledge base does not contain enough information to answer reliably."


def has_relevant_evidence(query: str, hits: list[SearchHit]) -> bool:
    if not hits:
        return False
    top = hits[0]
    if top.rerank_score is not None:
        return top.rerank_score >= 0.5
    if top.dense_score is not None and top.dense_score >= 0.7:
        return True
    query_terms = {term.casefold() for term in WORD_RE.findall(query) if len(term) > 2}
    evidence_terms = set(WORD_RE.findall(top.chunk.retrieval_text.casefold()))
    return top.lexical_rank is not None and bool(query_terms & evidence_terms)


def citations_from_hits(
    hits: list[SearchHit],
    limit: int = 6,
    max_excerpt_chars: int = 4_000,
) -> tuple[Citation, ...]:
    citations: list[Citation] = []
    seen_parents: set[str] = set()
    for hit in hits:
        chunk = hit.chunk
        if chunk.parent_id in seen_parents:
            continue
        seen_parents.add(chunk.parent_id)
        citations.append(
            Citation(
                id=len(citations) + 1,
                title=chunk.title,
                heading=" > ".join(chunk.heading_path),
                url=chunk.url,
                excerpt=chunk.raw_text[:max_excerpt_chars],
            )
        )
        if len(citations) == limit:
            break
    return tuple(citations)


class ExtractiveAnswerer:
    """Safe fallback that exposes retrieved evidence without inventing a synthesis."""

    def answer(self, query: str, hits: list[SearchHit]) -> Answer:
        citations = citations_from_hits(hits, limit=1)
        if not has_relevant_evidence(query, hits):
            return Answer("not_found", not_found_text(query), ())
        lines = [f"[{item.id}] {item.excerpt.strip()}" for item in citations]
        return Answer("evidence_found", "\n\n".join(lines), citations)


class Qwen3Answerer:
    name = "Qwen/Qwen3-4B"

    def __init__(self, max_new_tokens: int = 512) -> None:
        try:
            import torch
            from transformers import AutoModelForCausalLM, AutoTokenizer
        except ImportError as error:
            raise RuntimeError("Install model dependencies with: uv sync --extra models") from error
        self.torch = torch
        self.device = "mps" if torch.backends.mps.is_available() else "cpu"
        self.max_new_tokens = max_new_tokens
        self.tokenizer = AutoTokenizer.from_pretrained(self.name)
        self.model = AutoModelForCausalLM.from_pretrained(self.name, dtype="auto")
        self.model.to(self.device).eval()
        self.model.generation_config.temperature = None
        self.model.generation_config.top_p = None
        self.model.generation_config.top_k = None
        self._inference_lock = Lock()

    def answer(self, query: str, hits: list[SearchHit]) -> Answer:
        if not has_relevant_evidence(query, hits):
            return Answer("not_found", not_found_text(query), ())
        answer_text, citations = self.generate(query, hits)
        return answer_from_generation(answer_text, citations, query)

    def generate(self, query: str, hits: list[SearchHit]) -> tuple[str, tuple[Citation, ...]]:
        citations = citations_from_hits(hits, limit=4)
        evidence = "\n\n".join(
            f"[{item.id}] {item.title} > {item.heading}\n{item.excerpt}" for item in citations
        )
        prompt = (
            "仅根据给定知识库证据回答，不使用模型记忆，只输出一个 JSON 对象。"
            '可回答格式：{"status":"answered","answer":"简短答案 [1]"}。'
            '不可回答格式：{"status":"not_found","answer":"知识库中没有足够信息"}。'
            "使用和用户相同的语言；answered 的每项事实必须紧跟真实证据编号如 [1]，"
            "编号只能从下方证据复制。证据不能完整回答时必须返回 not_found。\n\n"
            f"用户问题：{query}\n\n知识库证据：\n{evidence}"
        )
        messages = [{"role": "user", "content": prompt}]
        text = self.tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True,
            enable_thinking=False,
        )
        inputs = self.tokenizer([text], return_tensors="pt").to(self.device)
        with self._inference_lock, self.torch.inference_mode():
            output = self.model.generate(
                **inputs,
                max_new_tokens=self.max_new_tokens,
                do_sample=False,
            )
        generated = output[0, inputs.input_ids.shape[1] :]
        answer_text = self.tokenizer.decode(generated, skip_special_tokens=True).strip()
        return answer_text, citations


def answer_from_generation(
    text: str,
    citations: tuple[Citation, ...],
    query: str = "",
) -> Answer:
    try:
        start = text.index("{")
        end = text.rindex("}") + 1
        payload = json.loads(text[start:end])
    except (ValueError, json.JSONDecodeError):
        return Answer("not_found", not_found_text(query), ())
    if payload.get("status") != "answered":
        return Answer("not_found", not_found_text(query), ())
    valid_ids = {citation.id for citation in citations}
    answer_text = str(payload.get("answer") or "").strip()
    cited_in_text = {int(item) for item in re.findall(r"\[(\d+)]", answer_text)}
    used_ids = valid_ids & cited_in_text
    if not answer_text or not used_ids or cited_in_text != used_ids:
        return Answer("not_found", not_found_text(query), ())
    claim_boundary = r"(?:\n+|[;；。！？]+|(?<=[.!?])\s+)"
    claims = [claim.strip() for claim in re.split(claim_boundary, answer_text)]
    uncited_claim = any(
        WORD_RE.search(claim) and not re.search(r"\[\d+]", claim) for claim in claims
    )
    if uncited_claim:
        return Answer("not_found", not_found_text(query), ())
    selected = tuple(citation for citation in citations if citation.id in used_ids)
    return Answer("answered", answer_text, selected)


def create_answerer(name: str):
    if name == "extractive":
        return ExtractiveAnswerer()
    if name == "qwen3":
        return Qwen3Answerer()
    raise ValueError(f"Unknown answerer: {name}")
