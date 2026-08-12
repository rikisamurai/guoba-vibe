from __future__ import annotations

import re

from .domain import SearchHit

WORD_RE = re.compile(r"\w+", re.UNICODE)


def _text_shingles(text: str, size: int = 8) -> set[tuple[str, ...]]:
    tokens = [token.casefold() for token in WORD_RE.findall(text)]
    return {tuple(tokens[index : index + size]) for index in range(len(tokens) - size + 1)}


def evidence_matches_hit(gold: dict[str, object], hit: SearchHit) -> bool:
    if gold["path"] != hit.chunk.page_path:
        return False
    if tuple(gold["heading_path"]) != hit.chunk.heading_path:
        return False
    gold_text = str(gold.get("text", ""))
    gold_shingles = _text_shingles(gold_text)
    hit_shingles = _text_shingles(hit.chunk.raw_text)
    if gold_shingles and hit_shingles:
        return bool(gold_shingles & hit_shingles)
    normalized_gold = " ".join(gold_text.split()).casefold()
    normalized_hit = " ".join(hit.chunk.raw_text.split()).casefold()
    shorter, longer = sorted((normalized_gold, normalized_hit), key=len)
    return len(shorter) >= 20 and shorter in longer
