# Guoba Skills product specification

## Goal

Build a focused Skill manager for macOS and repository workflows. It manages only the universal `.agents/skills` source and the Claude `.claude/skills` projection. `.agents/skills` is always canonical; Claude entries are symlinks back to the canonical copy.

## Required surfaces

- A downloadable Electron macOS application.
- A repository CLI whose default interactive mode is a TUI.
- A local Web UI launched from a repository command.
- The Electron and Web surfaces share one React renderer and one domain service.

## Scope and discovery

- Support Project and User scopes at the same time.
- Project canonical path: `<repo>/.agents/skills`.
- Project Claude path: `<repo>/.claude/skills`.
- User canonical path: `~/.agents/skills`.
- User Claude path: `~/.claude/skills`.
- A repository session shows both its Project Skills and User Skills.
- Claude-only directories remain visible and can be made canonical explicitly.
- Do not support any other agent or path.

## Install, sync, and update

- Accept skills.sh URLs and GitHub-backed sources resolved from them.
- Install and update the canonical `.agents/skills/<name>` directory.
- Maintain a human-readable lock file with source, ref, subpath, revision, content hash, and timestamps.
- Reuse existing `skills-lock.json` provenance when present.
- Check remote revision, then compare the actual Skill subdirectory to avoid monorepo false positives.
- Show file-level and text diff before update confirmation.
- Replace the canonical directory atomically and restore it on failure.
- Recreate the matching Claude symlink after install or update.
- Never silently overwrite a real Claude directory or an unrelated symlink.

## Electron application

- Native-feeling macOS window with hidden inset title bar and traffic-light spacing.
- Open and remember a selected repository.
- Aggregate Project and User sections, searchable from one view.
- Read `SKILL.md`, browse files, inspect provenance and Claude link health.
- Check one or many Skills, select updates, review diff, install, update, repair links, and make Claude-only Skills canonical.

## Repository CLI, TUI, and Web UI

- Running `guoba-skills` in a repository opens the TUI.
- `guoba-skills list`, `check`, `update`, `sync`, and `install` have non-interactive forms.
- `guoba-skills ui` opens the local Web UI and aggregates Project and User Skills.
- TUI and Web UI can check and update Skills, not only list them.

## Quality and delivery

- Source files stay below the repository's 200-line limit unless a reasoned exemption is present.
- Vitest covers parsing, scanning, lock compatibility, symlink safety, update detection, diffing, and atomic replacement.
- Playwright covers the built Web UI and packaged Electron renderer flows.
- CI runs formatting, lint, typecheck, unit tests, Web E2E, Electron E2E, and macOS packaging.
- Pull requests publish downloadable unsigned macOS artifacts.
- Version tags create a GitHub Release with arm64/x64 DMG and ZIP assets, with optional signing/notarization when secrets exist.

## Non-goals

- Windows or Linux desktop packages.
- Agents other than Codex/universal `.agents` and Claude `.claude`.
- A hosted backend, account system, registry mirror, presets, cloud backup, or cross-device sync.
- Automatic merging of locally edited Skill content with upstream.

## Acceptance criteria

1. The macOS app launches and displays Project and User fixtures from both supported paths.
2. The repository TUI and Web UI display the same aggregated inventory.
3. Installing or updating writes only to `.agents/skills` and creates safe Claude symlinks.
4. An update cannot execute until its diff has been presented to the caller.
5. Unit and E2E suites pass locally and in CI.
6. A PR contains the implementation, release workflow, usage documentation, screenshots, and downloadable build artifact workflow.
