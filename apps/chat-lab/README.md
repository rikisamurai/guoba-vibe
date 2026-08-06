# chat-lab

A chat workbench for studying **streaming markdown rendering**. The chat is the
shell; the lab is the point: four switchable renderer pipelines over one shared
transport, a deterministic chunk simulator, and live metrics — so each layer of
the streaming-render problem can be observed, compared and measured.

## The four renderer modes

| Mode           | Strategy                                                                                     | What it teaches                                          |
| -------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| M0 · Naive     | full react-markdown reparse on every delta                                                   | the baseline everything else must beat                   |
| M1 · Throttled | 16–160ms merged commits + render-only tail repair                                            | display clock ≠ arrival clock; optimistic syntax closing |
| M2 · Blocks    | marked.lexer splits top-level blocks, frozen stable prefix, dirty-tail relex                 | stable ids + memo make old content free                  |
| M3 · Scheduled | M2 + Shiki (highlight once when the fence closes) and Mermaid (debounce, keep last good SVG) | heavy nodes need their own clock                         |

Switching the mode re-renders the whole transcript, so identical content can be
compared across modes. Raw text is never touched: tail repair and block
derivation happen at render time only, and terminal phases re-parse the
original text.

## Sources

- **Simulator** (default): replays four bundled corpora (long-form, code-heavy,
  mermaid, hostile edge cases) through deterministic chunk plans —
  `ideal` / `jitter` / `burst` / `boundary` (cuts inside `**`, fences and
  UTF-8 sequences). No API cost, fully reproducible, byte-level like the
  network path.
- **Live API**: DeepSeek and Kimi through `api/chat.ts`, an SSE passthrough
  proxy with a provider/model whitelist. Keys stay server-side.

## Metrics

Commits/s (2s window), raw→visible latency p50/p95, render cost per commit
(React Profiler) and stable-block ratio. The panel polls at 4Hz so observing
never distorts what is observed.

## Setup

```bash
cp .env.example .env.local   # fill DEEPSEEK_API_KEY / KIMI_API_KEY
pnpm install                 # from the repo root
pnpm --filter chat-lab dev   # http://localhost:5173
```

The simulator works without keys. `vite preview` serves the static build only —
the API runs in dev (via `dev-api-plugin.ts`) or on Vercel functions.

```bash
pnpm --filter chat-lab test  # vitest, pure-logic pipeline coverage
pnpm --filter chat-lab lint  # oxlint (max-lines 200 enforced)
```

## Suggested experiments

1. `hostile edge cases` + `boundary` under M0 — watch `**` and fences flicker.
2. Same run under M1 — flicker gone; check commits/s drop as you raise the
   commit interval.
3. M2 + React DevTools "highlight updates" — only the dirty tail repaints.
4. `mermaid diagrams` under M3 — diagrams wait, settle once, never thrash.
5. Turn on **smooth reveal** — the phase passes through `draining` after the
   source finishes, and the cursor never splits an emoji.
