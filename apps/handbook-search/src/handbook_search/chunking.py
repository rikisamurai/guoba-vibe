from __future__ import annotations

import hashlib
import re
from collections.abc import Iterable

from .domain import Chunk, Page, Section

TOKEN_RE = re.compile(r"\w+|[^\w\s]", re.UNICODE)


def approx_tokens(text: str) -> int:
    return len(TOKEN_RE.findall(text))


def _stable_id(*parts: object) -> str:
    value = "\x1f".join(str(part) for part in parts)
    return hashlib.sha256(value.encode()).hexdigest()[:20]


def _content_hash(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()


def _anchor(heading: str) -> str:
    value = heading.lower().strip()
    value = re.sub(r"[^\w\s-]", "", value, flags=re.UNICODE)
    return re.sub(r"[-\s]+", "-", value).strip("-")


def _split_long_block(block: str, max_tokens: int) -> list[str]:
    if approx_tokens(block) <= max_tokens:
        return [block]
    lines = [line for line in block.splitlines() if line.strip()]
    if len(lines) > 1:
        return _pack_blocks(lines, max_tokens, 0)
    sentences = re.split(r"(?<=[.!?])\s+", block)
    if len(sentences) > 1:
        return _pack_blocks(sentences, max_tokens, 0)
    words = block.split()
    return [
        " ".join(words[start : start + max_tokens]) for start in range(0, len(words), max_tokens)
    ]


def _pack_blocks(blocks: Iterable[str], target_tokens: int, overlap_tokens: int) -> list[str]:
    packed: list[str] = []
    current: list[str] = []
    current_tokens = 0
    for original in blocks:
        for block in _split_long_block(original.strip(), target_tokens):
            block_tokens = approx_tokens(block)
            if current and current_tokens + block_tokens > target_tokens:
                packed.append("\n\n".join(current))
                overlap = current[-1] if approx_tokens(current[-1]) <= overlap_tokens else ""
                current = [overlap] if overlap else []
                current_tokens = approx_tokens(overlap)
            current.append(block)
            current_tokens += block_tokens
    if current:
        packed.append("\n\n".join(current))
    return packed


def chunk_section(
    page: Page,
    section: Section,
    target_tokens: int = 420,
    overlap_tokens: int = 50,
) -> list[Chunk]:
    blocks = re.split(r"\n\s*\n", section.body)
    texts = _pack_blocks(blocks, target_tokens, overlap_tokens)
    heading = " > ".join(section.heading_path)
    parent_id = _stable_id(page.path, section.ordinal, heading)
    anchor = section.anchor or (_anchor(section.heading_path[-1]) if section.heading_path else "")
    url = f"{page.url}#{anchor}" if anchor else page.url
    chunks: list[Chunk] = []
    for ordinal, raw_text in enumerate(texts):
        context = " > ".join(part for part in (page.title, heading) if part)
        retrieval_text = f"{context}\n\n{raw_text}"
        chunks.append(
            Chunk(
                chunk_id=_stable_id(parent_id, ordinal, raw_text),
                parent_id=parent_id,
                page_path=page.path,
                title=page.title,
                heading_path=section.heading_path,
                url=url,
                ordinal=ordinal,
                raw_text=raw_text,
                retrieval_text=retrieval_text,
                content_hash=_content_hash(raw_text),
            )
        )
    return chunks


def chunk_page(page: Page, sections: Iterable[Section]) -> list[Chunk]:
    return [chunk for section in sections for chunk in chunk_section(page, section)]
