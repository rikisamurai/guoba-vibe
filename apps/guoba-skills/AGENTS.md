# Guoba Skills agent guide

## Product boundary

- Support only `<scope>/.agents/skills` and `<scope>/.claude/skills`.
- `.agents/skills` is canonical. Claude entries are safe symlinks to it.
- Never overwrite a real Claude directory or an unrelated symlink.
- Project and User scopes must remain visible together.
- `skills.sh` is a discovery surface; Git is the content and revision authority.

## Architecture

- Keep scanning, provenance, hashing, diffing, and updates in `src/core`.
- Electron, Web, CLI, and TUI call the same `SkillManager` service.
- Electron renderer access goes through the typed preload bridge; keep Node disabled and sandboxing on.
- The local Web server binds only to `127.0.0.1`.
- Keep each source file below the repository's 200-line rule and split by cohesion.

## Update safety

- An update is always `check → prepare/diff → apply`.
- `prepare` pins an exact Git revision; `apply` must use that same prepared content.
- Recheck the local content hash before applying.
- Replace canonical content atomically and roll back if metadata or link synchronization fails.
- Store Project provenance in the repository-visible `skills-lock.json`.
- Do not log or persist credentials. Use system Git credentials or SSH.

## Verification

- Add Vitest coverage for domain and filesystem behavior.
- Add Playwright Web coverage for shared UI behavior.
- Add Playwright Electron coverage for shell/IPC behavior.
- For visible UI changes, update the design evidence under `docs/design/` after browser verification.
