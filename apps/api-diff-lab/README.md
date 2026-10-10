# API Diff Lab

API Diff Lab is a local-first JSON contract review tool. Paste a before and after payload, inspect inferred shape changes, save snapshots, and export a Markdown review report.

## What it guarantees

- Walks nested objects and array items using stable paths such as `items[].id`.
- Detects root type changes, empty-container changes, and heterogeneous array item types.
- Labels removals and type drift as breaking; additions stay in review because strict decoders may reject them.
- Rejects empty, duplicate, or malformed library imports instead of replacing state with unusable data.
- Preserves same-named snapshots with unique IDs in browser storage.

This is sample-driven shape inference, not an OpenAPI compatibility checker. It cannot infer required fields, enums, nullability, or server-side semantics from one JSON example.

## Workflow

1. Select a saved contract or paste JSON into the Before and After editors.
2. Review changed, removed, and added paths plus their inferred types.
3. Save a named snapshot, export the local library, or copy the Markdown report into a PR.

## Commands

```bash
pnpm --filter api-diff-lab dev
pnpm --filter api-diff-lab lint
pnpm --filter api-diff-lab test
pnpm --filter api-diff-lab build
```
