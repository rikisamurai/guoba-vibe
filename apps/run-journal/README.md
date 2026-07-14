# Run Journal

Run Journal is a local-first evidence log for commands used to verify a change. It separates a command from its observed result so pasted text can never be mistaken for a passing check.

## Evidence model

- `Draft`: at least one command has no recorded result (`exitCode: null`), and no known failure exists.
- `Passed`: every recorded command has an explicit `exitCode: 0`.
- `Failed`: at least one recorded command has a nonzero exit code. Known failures take precedence over draft steps.
- v1 journals migrate executable steps to Draft because the old schema auto-filled exit code `0`; those results cannot be trusted retroactively.

Each run may also carry a working directory, commit, duration, raw output excerpt, and safe artifact links. Run IDs are generated independently from titles, so repeated or non-ASCII titles retain their history.

For mixed command results, prefix individual lines with an observed exit code (`[0] pnpm test`, `[2] pnpm build`) or `[?]` for unknown. Untagged pasted lines use the selected default, which starts as Draft.

## Local usage

```bash
pnpm --filter run-journal dev
pnpm --filter run-journal lint
pnpm --filter run-journal test
pnpm --filter run-journal build
```

The app persists a versioned JSON envelope in browser localStorage. Export downloads that same schema; Import validates all records and rejects unsafe artifact schemes before replacing the current journal.
