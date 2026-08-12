from __future__ import annotations

import json
import os
from collections.abc import Iterator
from pathlib import Path
from typing import Annotated

import typer

from .answering import create_answerer
from .chunking import chunk_page
from .config import (
    DEFAULT_CONFIG_PATH,
    DEFAULT_INDEX_DIR,
    DEFAULT_SOURCE_DIR,
    load_source_config,
)
from .domain import Chunk
from .embeddings import create_embedder
from .evaluation import generate_candidates, write_candidates_jsonl
from .evaluation_runner import run_answerability_evaluation, run_retrieval_evaluation
from .markdown import iter_pages, split_sections
from .runtime import open_retriever
from .service import answer_query
from .source import content_path, sync_source, verify_source
from .store import build_index

app = typer.Typer(no_args_is_help=True)


def _chunks(source_dir: Path, config_path: Path, page_limit: int | None) -> Iterator[Chunk]:
    config = load_source_config(config_path)
    root = content_path(config, source_dir)
    for page in iter_pages(root, config, page_limit):
        yield from chunk_page(page, split_sections(page))


@app.command()
def fetch(
    source_dir: Annotated[Path, typer.Option()] = DEFAULT_SOURCE_DIR,
    config: Annotated[Path, typer.Option()] = DEFAULT_CONFIG_PATH,
) -> None:
    commit = sync_source(load_source_config(config), source_dir)
    typer.echo(f"Fetched {commit} into {source_dir}")


@app.command()
def index(
    source_dir: Annotated[Path, typer.Option()] = DEFAULT_SOURCE_DIR,
    index_dir: Annotated[Path, typer.Option()] = DEFAULT_INDEX_DIR,
    config: Annotated[Path, typer.Option()] = DEFAULT_CONFIG_PATH,
    embedder: Annotated[str, typer.Option()] = "e5-small",
    page_limit: Annotated[int | None, typer.Option(min=1)] = None,
) -> None:
    source_config = load_source_config(config)
    source_commit = verify_source(source_config, source_dir)
    count = build_index(
        _chunks(source_dir, config, page_limit),
        create_embedder(embedder),
        index_dir,
        source_commit,
    )
    typer.echo(f"Indexed {count} chunks into {index_dir}")


@app.command()
def search(
    query: str,
    index_dir: Annotated[Path, typer.Option()] = DEFAULT_INDEX_DIR,
    embedder: Annotated[str, typer.Option()] = "auto",
    reranker: Annotated[str, typer.Option()] = "minilm",
    query_rewriter: Annotated[str, typer.Option()] = "zh-en",
    limit: Annotated[int, typer.Option(min=1, max=50)] = 10,
) -> None:
    retriever = open_retriever(index_dir, embedder, reranker, query_rewriter)
    try:
        hits = retriever.search(query.strip(), limit=limit)
        typer.echo(json.dumps([hit_to_dict(hit) for hit in hits], ensure_ascii=False, indent=2))
    finally:
        retriever.store.close()


def hit_to_dict(hit) -> dict[str, object]:
    return {
        "title": hit.chunk.title,
        "heading": list(hit.chunk.heading_path),
        "url": hit.chunk.url,
        "text": hit.chunk.raw_text,
        "rrf_score": hit.score,
        "lexical_score": hit.lexical_score,
        "dense_score": hit.dense_score,
        "rerank_score": hit.rerank_score,
    }


@app.command()
def ask(
    query: str,
    index_dir: Annotated[Path, typer.Option()] = DEFAULT_INDEX_DIR,
    embedder: Annotated[str, typer.Option()] = "auto",
    reranker: Annotated[str, typer.Option()] = "minilm",
    query_rewriter: Annotated[str, typer.Option()] = "zh-en",
    answerer: Annotated[str, typer.Option()] = "extractive",
) -> None:
    retriever = open_retriever(index_dir, embedder, reranker, query_rewriter)
    try:
        active_answerer = create_answerer(answerer)
        result = answer_query(query.strip(), retriever, active_answerer)
        typer.echo(json.dumps(result.to_dict(), ensure_ascii=False, indent=2))
    finally:
        retriever.store.close()


@app.command("eval-seed")
def eval_seed(
    output: Annotated[Path, typer.Option()] = Path(".data/eval/candidates.jsonl"),
    source_dir: Annotated[Path, typer.Option()] = DEFAULT_SOURCE_DIR,
    config: Annotated[Path, typer.Option()] = DEFAULT_CONFIG_PATH,
    page_limit: Annotated[int | None, typer.Option(min=1)] = None,
) -> None:
    source_config = load_source_config(config)
    pages = iter_pages(content_path(source_config, source_dir), source_config, page_limit)
    count = write_candidates_jsonl(generate_candidates(pages, source_config.commit), output)
    typer.echo(f"Wrote {count} review candidates to {output}")


@app.command("eval-run")
def eval_run(
    dataset: Path,
    index_dir: Annotated[Path, typer.Option()] = DEFAULT_INDEX_DIR,
    embedder: Annotated[str, typer.Option()] = "auto",
    reranker: Annotated[str, typer.Option()] = "minilm",
    query_rewriter: Annotated[str, typer.Option()] = "zh-en",
    allow_unreviewed: Annotated[bool, typer.Option()] = False,
) -> None:
    retriever = open_retriever(index_dir, embedder, reranker, query_rewriter)
    try:
        retriever.warm_up()
        result = run_retrieval_evaluation(
            retriever,
            dataset,
            approved_only=not allow_unreviewed,
        )
        typer.echo(json.dumps(result, ensure_ascii=False, indent=2))
    finally:
        retriever.store.close()


@app.command("eval-answerability")
def eval_answerability(
    dataset: Path,
    index_dir: Annotated[Path, typer.Option()] = DEFAULT_INDEX_DIR,
    embedder: Annotated[str, typer.Option()] = "auto",
    reranker: Annotated[str, typer.Option()] = "minilm",
    query_rewriter: Annotated[str, typer.Option()] = "zh-en",
) -> None:
    """Evaluate the evidence gate against Gold retrieved in the current Top 10."""
    retriever = open_retriever(index_dir, embedder, reranker, query_rewriter)
    try:
        retriever.warm_up()
        result = run_answerability_evaluation(retriever, dataset)
        typer.echo(json.dumps(result, ensure_ascii=False, indent=2))
    finally:
        retriever.store.close()


@app.command()
def serve(
    reranker: Annotated[str, typer.Option()] = "minilm",
    query_rewriter: Annotated[str, typer.Option()] = "zh-en",
    answerer: Annotated[str, typer.Option()] = "extractive",
    host: Annotated[str, typer.Option()] = "127.0.0.1",
    port: Annotated[int, typer.Option()] = 8000,
) -> None:
    import uvicorn

    os.environ["HANDBOOK_RERANKER"] = reranker
    os.environ["HANDBOOK_QUERY_REWRITER"] = query_rewriter
    os.environ["HANDBOOK_ANSWERER"] = answerer
    uvicorn.run("handbook_search.api:app", host=host, port=port)
