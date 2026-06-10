# apps/qr-vault

Local-first QR vault built with Vite, React Router, React 19, Tailwind v4, shadcn/Radix primitives, and Vitest.

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
- Any UI, CSS, component, shadcn alias, or frontend import-path change must be verified with Agent Browser against the local dev server:

```bash
AGENT_BROWSER_SESSION_NAME=guoba agent-browser open http://localhost:<port>/
AGENT_BROWSER_SESSION_NAME=guoba agent-browser snapshot -i -c
```

Perform at least one safe interaction relevant to the change, such as toggling the sidebar, focusing search, switching theme/language, or navigating to the touched route.
