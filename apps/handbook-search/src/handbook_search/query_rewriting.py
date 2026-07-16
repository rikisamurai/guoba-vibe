from __future__ import annotations

import re
from threading import Lock
from typing import Protocol

CJK_RE = re.compile(r"[\u3400-\u9fff]")


class QueryRewriter(Protocol):
    name: str

    def rewrite(self, query: str) -> str: ...

    def warm_up(self) -> None: ...


class ChineseToEnglishRewriter:
    name = "Helsinki-NLP/opus-mt-zh-en"

    def __init__(self) -> None:
        self._load_lock = Lock()
        self._inference_lock = Lock()
        self._model = None
        self._tokenizer = None
        self._device = "cpu"

    def _load(self) -> None:
        if self._model is not None:
            return
        with self._load_lock:
            if self._model is not None:
                return
            try:
                import torch
                from transformers import MarianMTModel, MarianTokenizer
            except ImportError as error:
                message = "Install query-rewrite dependencies with: uv sync --extra models"
                raise RuntimeError(message) from error
            if torch.cuda.is_available():
                self._device = "cuda"
            elif torch.backends.mps.is_available():
                self._device = "mps"
            self._torch = torch
            self._tokenizer = MarianTokenizer.from_pretrained(self.name)
            self._model = MarianMTModel.from_pretrained(self.name)
            self._model.to(self._device).eval()

    def rewrite(self, query: str) -> str:
        if not CJK_RE.search(query):
            return query
        self._load()
        with self._inference_lock, self._torch.inference_mode():
            inputs = self._tokenizer(
                [query],
                return_tensors="pt",
                truncation=True,
            ).to(self._device)
            tokens = self._model.generate(**inputs, max_new_tokens=128)
        return self._tokenizer.batch_decode(tokens, skip_special_tokens=True)[0]

    def warm_up(self) -> None:
        self.rewrite("知识库检索")


def create_query_rewriter(name: str) -> QueryRewriter | None:
    if name == "none":
        return None
    if name == "zh-en":
        return ChineseToEnglishRewriter()
    raise ValueError(f"Unknown query rewriter: {name}")
