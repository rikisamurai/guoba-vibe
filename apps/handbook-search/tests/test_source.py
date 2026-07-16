from __future__ import annotations

import subprocess
from pathlib import Path

import pytest

from handbook_search.domain import SourceConfig
from handbook_search.source import verify_source


def _git(repo: Path, *args: str) -> str:
    result = subprocess.run(["git", *args], cwd=repo, check=True, capture_output=True, text=True)
    return result.stdout.strip()


def test_verify_source_requires_pinned_clean_checkout(tmp_path: Path) -> None:
    repo = tmp_path / "source"
    content = repo / "content" / "handbook"
    content.mkdir(parents=True)
    (content / "page.md").write_text("# Page\n\nOriginal.")
    _git(repo, "init")
    _git(repo, "config", "user.email", "test@example.com")
    _git(repo, "config", "user.name", "Test")
    _git(repo, "add", ".")
    _git(repo, "commit", "-m", "source")
    commit = _git(repo, "rev-parse", "HEAD")
    config = SourceConfig(
        name="Test",
        repository="https://example.test/source.git",
        commit=commit,
        content_root="content/handbook",
        public_base_url="https://example.test/handbook",
        content_license="CC BY-SA 4.0",
        attribution_url="https://example.test/handbook",
    )

    assert verify_source(config, repo) == commit

    (content / "page.md").write_text("# Page\n\nChanged.")
    with pytest.raises(RuntimeError, match="local content changes"):
        verify_source(config, repo)
