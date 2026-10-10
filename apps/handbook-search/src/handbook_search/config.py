from __future__ import annotations

import json
from pathlib import Path

from .domain import SourceConfig

APP_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_SOURCE_DIR = APP_ROOT / ".cache" / "handbook-source"
DEFAULT_INDEX_DIR = APP_ROOT / ".data" / "index"
DEFAULT_CONFIG_PATH = APP_ROOT / "knowledge-source.json"


def load_source_config(path: Path = DEFAULT_CONFIG_PATH) -> SourceConfig:
    return SourceConfig(**json.loads(path.read_text()))
