from __future__ import annotations

import re
from pathlib import Path

import yaml

from .domain import Page, Section, SourceConfig

HEADING_RE = re.compile(r"^(#{1,6})\s+(.+?)\s*$")
EXPLICIT_ANCHOR_RE = re.compile(r"\s*\{#([^}\s]+)\}\s*$")
SHORTCODE_RE = re.compile(r"{{[<%].*?[>%]}}", re.DOTALL)
HTML_COMMENT_RE = re.compile(r"<!--.*?-->", re.DOTALL)


def _split_frontmatter(text: str) -> tuple[dict[str, object], str]:
    if not text.startswith("---\n"):
        return {}, text
    end = text.find("\n---\n", 4)
    if end == -1:
        return {}, text
    metadata = yaml.safe_load(text[4:end]) or {}
    return metadata, text[end + 5 :]


def _clean_heading(value: str) -> str:
    value = EXPLICIT_ANCHOR_RE.sub("", value)
    value = re.sub(r"\s+#+$", "", value)
    value = re.sub(r"\[([^]]+)]\([^)]*\)", r"\1", value)
    return re.sub(r"[*_`]", "", value).strip()


def page_url(relative_path: Path, base_url: str) -> str:
    path = relative_path.as_posix()
    if path == "_index.md":
        path = ""
    elif path.endswith("/_index.md"):
        path = path[: -len("_index.md")]
    elif path.endswith(".md"):
        path = path[:-3] + "/"
    return f"{base_url.rstrip('/')}/{path.lstrip('/')}"


def load_page(path: Path, content_root: Path, config: SourceConfig) -> Page:
    metadata, body = _split_frontmatter(path.read_text(errors="replace"))
    relative_path = path.relative_to(content_root)
    title = str(metadata.get("title") or "").strip()
    if not title:
        first_heading = next(
            (match.group(2) for line in body.splitlines() if (match := HEADING_RE.match(line))),
            relative_path.stem.replace("-", " ").title(),
        )
        title = _clean_heading(first_heading)
    return Page(
        path=relative_path.as_posix(),
        title=title,
        description=str(metadata.get("description") or "").strip(),
        body=body,
        url=page_url(relative_path, config.public_base_url),
    )


def split_sections(page: Page) -> list[Section]:
    sections: list[Section] = []
    heading_stack: list[tuple[int, str]] = []
    lines: list[str] = []
    in_fence = False
    current_anchor = ""

    def flush() -> None:
        body = "\n".join(lines).strip()
        body = HTML_COMMENT_RE.sub("", body)
        body = SHORTCODE_RE.sub(" ", body).strip()
        if body:
            headings = tuple(heading for _, heading in heading_stack)
            sections.append(Section(headings, body, len(sections), current_anchor))
        lines.clear()

    for line in page.body.splitlines():
        stripped = line.lstrip()
        if stripped.startswith(("```", "~~~")):
            in_fence = not in_fence
        match = None if in_fence else HEADING_RE.match(line)
        if not match:
            lines.append(line)
            continue
        flush()
        level = len(match.group(1))
        raw_heading = match.group(2)
        anchor_match = EXPLICIT_ANCHOR_RE.search(raw_heading)
        current_anchor = anchor_match.group(1) if anchor_match else ""
        heading = _clean_heading(raw_heading)
        while heading_stack and heading_stack[-1][0] >= level:
            heading_stack.pop()
        heading_stack.append((level, heading))
    flush()
    return sections


def iter_pages(content_root: Path, config: SourceConfig, limit: int | None = None):
    paths = sorted(content_root.rglob("*.md"))
    if limit is not None:
        paths = paths[:limit]
    for path in paths:
        yield load_page(path, content_root, config)
