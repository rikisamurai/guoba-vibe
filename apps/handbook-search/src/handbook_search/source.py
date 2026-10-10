from __future__ import annotations

import subprocess
from pathlib import Path

from .domain import SourceConfig


def _git(*args: str, cwd: Path | None = None) -> str:
    result = subprocess.run(
        ["git", *args],
        cwd=cwd,
        check=True,
        capture_output=True,
        text=True,
    )
    return result.stdout.strip()


def sync_source(config: SourceConfig, destination: Path) -> str:
    destination.parent.mkdir(parents=True, exist_ok=True)
    if not (destination / ".git").exists():
        _git(
            "clone",
            "--filter=blob:none",
            "--no-checkout",
            config.repository,
            str(destination),
        )
    _git("fetch", "--depth", "1", "origin", config.commit, cwd=destination)
    _git("sparse-checkout", "init", "--cone", cwd=destination)
    _git("sparse-checkout", "set", config.content_root, cwd=destination)
    _git("checkout", "--detach", config.commit, cwd=destination)
    actual_commit = _git("rev-parse", "HEAD", cwd=destination)
    if actual_commit != config.commit:
        raise RuntimeError(f"Expected {config.commit}, got {actual_commit}")
    return actual_commit


def verify_source(config: SourceConfig, destination: Path) -> str:
    if not (destination / ".git").exists():
        raise FileNotFoundError(f"Knowledge source checkout is missing: {destination}")
    actual_commit = _git("rev-parse", "HEAD", cwd=destination)
    if actual_commit != config.commit:
        raise RuntimeError(f"Expected source {config.commit}, got {actual_commit}")
    changes = _git("status", "--porcelain", "--", config.content_root, cwd=destination)
    if changes:
        raise RuntimeError("Knowledge source has local content changes; fetch a clean snapshot")
    return actual_commit


def content_path(config: SourceConfig, source_dir: Path) -> Path:
    path = source_dir / config.content_root
    if not path.is_dir():
        raise FileNotFoundError(f"Knowledge source is missing: {path}. Run fetch first.")
    return path
