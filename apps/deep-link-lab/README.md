# Deep Link Lab

Deep Link Lab is a local-first compiler for web URLs and custom app links. It validates one source target, applies named profile overrides, and produces links that are ready to copy or dispatch without sending workspace data to a server.

## What it does

- Accepts `http`, `https`, and well-formed `scheme://target/path` app links.
- Blocks executable, file, browser-internal, credential-bearing, and malformed targets before output is enabled.
- Edits source query parameters and reusable profile overrides in place.
- Supports profile creation, deletion, renaming, stable IDs, and parameter key/value editing.
- Imports and exports a strict, versioned workspace JSON format.
- Autosaves valid workspaces in browser storage.

## Workspace format

```json
{
  "schema": "deep-link-lab.workspace/v1",
  "name": "Shopping launch links",
  "target": "myapp://checkout/confirm?sku=ABC123",
  "profiles": [
    {
      "id": "staging",
      "name": "Staging",
      "params": { "env": "staging" }
    }
  ]
}
```

Imports reject unknown fields, unsafe targets, malformed profiles, duplicate profile IDs or names, and non-string parameter values. Parameter keys are limited to URL-safe identifiers and prototype-sensitive names are blocked.

## Development

From the repository root:

```bash
pnpm --filter deep-link-lab dev
pnpm --filter deep-link-lab lint
pnpm --filter deep-link-lab test
pnpm --filter deep-link-lab build
```

The app is intentionally client-only. “Open request sent” confirms browser dispatch for a custom scheme; only the operating system can confirm whether a matching native app is installed.
