# Screenshot QA Board

An offline-first visual review workspace for pairing before/after screenshots with the context needed to reproduce a UI issue.

## Core workflow

1. Create an issue with route, viewport, browser, OS, capture time, severity, and notes.
2. Attach before/after evidence using durable URLs or images up to 900KB each.
3. Drag the comparison divider, then move the issue through `open`, `fixed`, and `accepted`.
4. Export the versioned board JSON for handoff or import it into another browser.

The app stores data in browser `localStorage`. Writes are capped at 4MB and failures are shown before in-memory state changes, so an issue never appears saved when persistence failed. Uploaded files are embedded as data URLs; use linked images for larger boards.

## Commands

```bash
pnpm --filter screenshot-qa-board dev
pnpm --filter screenshot-qa-board lint
pnpm --filter screenshot-qa-board test
pnpm --filter screenshot-qa-board build
```

Board imports require `schemaVersion: 2` and are rejected when issue metadata, image sources, or IDs are invalid.
