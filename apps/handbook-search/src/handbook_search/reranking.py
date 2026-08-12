from __future__ import annotations

from typing import Protocol

import numpy as np


class Reranker(Protocol):
    name: str

    def score(self, query: str, documents: list[str]) -> np.ndarray: ...


class Qwen3Reranker:
    name = "Qwen/Qwen3-Reranker-0.6B"
    instruction = "Retrieve passages that directly answer the user's knowledge-base question."
    prefix = (
        "<|im_start|>system\nJudge whether the Document meets the requirements based on "
        'the Query and the Instruct provided. Note that the answer can only be "yes" or '
        '"no".<|im_end|>\n<|im_start|>user\n'
    )
    suffix = "<|im_end|>\n<|im_start|>assistant\n<think>\n\n</think>\n\n"

    def __init__(self, batch_size: int = 4, max_length: int = 4096) -> None:
        try:
            import torch
            from transformers import AutoModelForCausalLM, AutoTokenizer
        except ImportError as error:
            raise RuntimeError("Install model dependencies with: uv sync --extra models") from error
        self.torch = torch
        self.device = "mps" if torch.backends.mps.is_available() else "cpu"
        self.batch_size = batch_size
        self.max_length = max_length
        self.tokenizer = AutoTokenizer.from_pretrained(self.name, padding_side="left")
        self.model = AutoModelForCausalLM.from_pretrained(self.name, dtype="auto")
        self.model.to(self.device).eval()
        self.no_id = self.tokenizer.convert_tokens_to_ids("no")
        self.yes_id = self.tokenizer.convert_tokens_to_ids("yes")
        self.prefix_tokens = self.tokenizer.encode(self.prefix, add_special_tokens=False)
        self.suffix_tokens = self.tokenizer.encode(self.suffix, add_special_tokens=False)

    def _pair(self, query: str, document: str) -> str:
        return f"<Instruct>: {self.instruction}\n<Query>: {query}\n<Document>: {document}"

    def score(self, query: str, documents: list[str]) -> np.ndarray:
        scores: list[float] = []
        for start in range(0, len(documents), self.batch_size):
            batch = documents[start : start + self.batch_size]
            pairs = [self._pair(query, document) for document in batch]
            inputs = self.tokenizer(
                pairs,
                padding=False,
                truncation="longest_first",
                return_attention_mask=False,
                max_length=self.max_length - len(self.prefix_tokens) - len(self.suffix_tokens),
            )
            for index, tokens in enumerate(inputs["input_ids"]):
                inputs["input_ids"][index] = self.prefix_tokens + tokens + self.suffix_tokens
            inputs = self.tokenizer.pad(
                inputs,
                padding=True,
                return_tensors="pt",
                max_length=self.max_length,
            ).to(self.device)
            with self.torch.inference_mode():
                logits = self.model(**inputs).logits[:, -1, [self.no_id, self.yes_id]]
                batch_scores = self.torch.softmax(logits, dim=-1)[:, 1]
            scores.extend(batch_scores.detach().float().cpu().tolist())
        return np.asarray(scores, dtype=np.float32)


class MiniLMReranker:
    """Low-latency multilingual profile for local CPU and Apple Silicon use."""

    name = "cross-encoder/mmarco-mMiniLMv2-L12-H384-v1"

    def __init__(self, batch_size: int = 32) -> None:
        try:
            import torch
            from sentence_transformers import CrossEncoder
        except ImportError as error:
            raise RuntimeError("Install model dependencies with: uv sync --extra models") from error
        device = "mps" if torch.backends.mps.is_available() else "cpu"
        self.batch_size = batch_size
        self.model = CrossEncoder(self.name, device=device, max_length=512)

    def score(self, query: str, documents: list[str]) -> np.ndarray:
        pairs = [(query, document) for document in documents]
        scores = self.model.predict(
            pairs,
            batch_size=self.batch_size,
            show_progress_bar=False,
        )
        logits = np.asarray(scores, dtype=np.float32).reshape(-1)
        return 1.0 / (1.0 + np.exp(-np.clip(logits, -30, 30)))


def create_reranker(name: str) -> Reranker | None:
    if name == "none":
        return None
    if name == "qwen3":
        return Qwen3Reranker()
    if name == "minilm":
        return MiniLMReranker()
    raise ValueError(f"Unknown reranker: {name}")
