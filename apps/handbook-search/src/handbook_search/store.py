from __future__ import annotations

import json
import re
import shutil
import sqlite3
from collections.abc import Iterable
from pathlib import Path
from threading import Lock, local

import numpy as np

from .domain import Chunk
from .embeddings import Embedder

DB_NAME = "search.sqlite3"
EMBEDDINGS_NAME = "embeddings.npy"
DENSE_IDS_NAME = "dense-ids.json"
META_NAME = "index-meta.json"
QUERY_TOKEN_RE = re.compile(r"\w[\w.-]*", re.UNICODE)


def _connect(path: Path, read_only: bool = False) -> sqlite3.Connection:
    if read_only:
        connection = sqlite3.connect(
            f"file:{path}?mode=ro",
            uri=True,
            check_same_thread=False,
        )
    else:
        connection = sqlite3.connect(path)
    connection.row_factory = sqlite3.Row
    return connection


def _create_schema(connection: sqlite3.Connection) -> None:
    connection.executescript(
        """
        CREATE TABLE chunks (
          chunk_id TEXT PRIMARY KEY, parent_id TEXT NOT NULL, page_path TEXT NOT NULL,
          title TEXT NOT NULL, heading_path TEXT NOT NULL, url TEXT NOT NULL,
          ordinal INTEGER NOT NULL, raw_text TEXT NOT NULL, retrieval_text TEXT NOT NULL,
          content_hash TEXT NOT NULL
        );
        CREATE VIRTUAL TABLE chunks_fts USING fts5(
          chunk_id UNINDEXED, title, heading_path, retrieval_text,
          tokenize='porter unicode61'
        );
        """
    )


def _insert_chunk(connection: sqlite3.Connection, chunk: Chunk) -> None:
    heading = " > ".join(chunk.heading_path)
    values = (
        chunk.chunk_id,
        chunk.parent_id,
        chunk.page_path,
        chunk.title,
        json.dumps(chunk.heading_path),
        chunk.url,
        chunk.ordinal,
        chunk.raw_text,
        chunk.retrieval_text,
        chunk.content_hash,
    )
    connection.execute("INSERT INTO chunks VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", values)
    connection.execute(
        "INSERT INTO chunks_fts VALUES (?, ?, ?, ?)",
        (chunk.chunk_id, chunk.title, heading, chunk.retrieval_text),
    )


def build_index(
    chunks: Iterable[Chunk],
    embedder: Embedder,
    destination: Path,
    source_commit: str,
) -> int:
    materialized = list(chunks)
    if not materialized:
        raise ValueError("Cannot build an index from an empty corpus")
    staging = destination.with_name(f"{destination.name}.staging")
    shutil.rmtree(staging, ignore_errors=True)
    staging.mkdir(parents=True)
    connection = _connect(staging / DB_NAME)
    _create_schema(connection)
    with connection:
        for chunk in materialized:
            _insert_chunk(connection, chunk)
    connection.close()
    embeddings = embedder.embed_documents([chunk.retrieval_text for chunk in materialized])
    np.save(staging / EMBEDDINGS_NAME, embeddings.astype(np.float32))
    (staging / DENSE_IDS_NAME).write_text(json.dumps([chunk.chunk_id for chunk in materialized]))
    (staging / META_NAME).write_text(
        json.dumps(
            {
                "source_commit": source_commit,
                "embedding_model": embedder.name,
                "chunk_count": len(materialized),
            },
            indent=2,
        )
    )
    shutil.rmtree(destination, ignore_errors=True)
    staging.rename(destination)
    return len(materialized)


class IndexStore:
    def __init__(self, path: Path) -> None:
        self.path = path
        self._local = local()
        self._connections: list[sqlite3.Connection] = []
        self._connections_lock = Lock()
        self.embeddings = np.load(path / EMBEDDINGS_NAME, mmap_mode="r")
        self.dense_ids = json.loads((path / DENSE_IDS_NAME).read_text())
        self.meta = json.loads((path / META_NAME).read_text())

    @property
    def connection(self) -> sqlite3.Connection:
        connection = getattr(self._local, "connection", None)
        if connection is None:
            connection = _connect(self.path / DB_NAME, read_only=True)
            self._local.connection = connection
            with self._connections_lock:
                self._connections.append(connection)
        return connection

    def close(self) -> None:
        with self._connections_lock:
            connections = self._connections.copy()
            self._connections.clear()
        for connection in connections:
            connection.close()

    def get_chunk(self, chunk_id: str) -> Chunk:
        row = self.connection.execute(
            "SELECT * FROM chunks WHERE chunk_id = ?", (chunk_id,)
        ).fetchone()
        if row is None:
            raise KeyError(chunk_id)
        return Chunk(
            chunk_id=row["chunk_id"],
            parent_id=row["parent_id"],
            page_path=row["page_path"],
            title=row["title"],
            heading_path=tuple(json.loads(row["heading_path"])),
            url=row["url"],
            ordinal=row["ordinal"],
            raw_text=row["raw_text"],
            retrieval_text=row["retrieval_text"],
            content_hash=row["content_hash"],
        )

    def get_parent_chunks(self, parent_id: str) -> list[Chunk]:
        rows = self.connection.execute(
            "SELECT chunk_id FROM chunks WHERE parent_id = ? ORDER BY ordinal",
            (parent_id,),
        ).fetchall()
        return [self.get_chunk(row["chunk_id"]) for row in rows]

    def lexical_search(self, query: str, limit: int) -> list[tuple[str, float]]:
        tokens = QUERY_TOKEN_RE.findall(query)
        if not tokens:
            return []
        expression = " OR ".join(f'"{token.replace(chr(34), "")}"' for token in tokens)
        rows = self.connection.execute(
            """
            SELECT chunk_id, -bm25(chunks_fts, 0.0, 8.0, 4.0, 1.0) AS score
            FROM chunks_fts WHERE chunks_fts MATCH ? ORDER BY score DESC LIMIT ?
            """,
            (expression, limit),
        ).fetchall()
        return [(row["chunk_id"], float(row["score"])) for row in rows]

    def dense_search(self, vector: np.ndarray, limit: int) -> list[tuple[str, float]]:
        scores = np.asarray(self.embeddings @ vector, dtype=np.float32)
        limit = min(limit, len(scores))
        if limit == 0:
            return []
        indexes = np.argpartition(scores, -limit)[-limit:]
        indexes = indexes[np.argsort(scores[indexes])[::-1]]
        return [(self.dense_ids[index], float(scores[index])) for index in indexes]
