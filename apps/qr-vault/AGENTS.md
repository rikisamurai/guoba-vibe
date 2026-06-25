# apps/qr-vault

Local-first QR vault built with Vite, React Router, React 19, Tailwind v4, shadcn/Radix primitives, and Vitest.

## Design

- Read `DESIGN.md` before any UI, CSS, component, layout, or visual copy change.
- Before any visible UI change that affects layout, visual hierarchy, styling, or information placement, produce a screenshot/mock/proposal image first and wait for Riki to approve the direction before editing implementation files.
- For vault rows, cards, detail panels, and toolbars, keep content display, metadata, and action controls visually separated unless the approved proposal intentionally combines them.
- Do not use implementation code as the first draft for subjective placement decisions, such as where collection labels, row metadata, or actions should live.
- Preserve the "private signal console" direction: compact, precise, local-first, scan-safe, and tool-focused.
- Do not turn app routes into marketing/hero pages; the first screen is the usable vault.

## Development

- Start locally with `pnpm --filter qr-vault dev`; Vite may choose the next free port if `5173` is busy.
- Build with `pnpm --filter qr-vault build`.
- shadcn-generated primitives live in `src/components/shadcn-ui`; app-owned components live outside that folder.

## Debugging

- State is local-browser storage. Prefer reproducing issues in the browser before changing storage helpers.
- Keep feature logic in `src/app`, reusable app components in `src/components`, and pure helpers in `src/lib`.
- Avoid production/Vercel loops for local UI debugging.

## Verification

- Run `pnpm --filter qr-vault lint` after code changes.
- Run `pnpm --filter qr-vault test` for logic/storage/url changes.
- Run `pnpm --filter qr-vault build` before completion when imports, routing, or component structure changes.
- Any UI, CSS, component, shadcn alias, or frontend import-path change must be verified with Agent Browser against the local dev server, then reported with an actual screenshot of the resulting UI so Riki can review the real pixels. If Agent Browser is unavailable, use an equivalent real-browser workflow and state the fallback explicitly.

```bash
AGENT_BROWSER_SESSION_NAME=guoba agent-browser open http://localhost:<port>/
AGENT_BROWSER_SESSION_NAME=guoba agent-browser snapshot -i -c
```

Perform at least one safe interaction relevant to the change, such as toggling the sidebar, focusing search, switching theme/language, or navigating to the touched route.
