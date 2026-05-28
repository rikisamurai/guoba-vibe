# AGENT.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

## Project tooling: agent-browser session persistence

The admin UI (`/admin`) is gated by GitHub OAuth (`ADMIN_GITHUB_ID`). To avoid re-doing OAuth on every browser command, use a named session that persists cookies across daemon restarts.

**Rule:** every `agent-browser` invocation in this repo must be prefixed with:

```bash
AGENT_BROWSER_SESSION_NAME=guoba agent-browser <cmd>
```

Cookies are saved to `~/.agent-browser/sessions/guoba-default.json` on daemon close and restored on next open. Do NOT export this env var globally — keep it per-command.

**One-time bootstrap** (only if session file is missing or cookies expired):

```bash
AGENT_BROWSER_SESSION_NAME=guoba agent-browser close          # drop any headless daemon
AGENT_BROWSER_SESSION_NAME=guoba agent-browser --headed open https://github.com
# user logs into github.com manually in the headed window
AGENT_BROWSER_SESSION_NAME=guoba agent-browser close          # flushes cookies to disk
```

After bootstrap, opening `https://guoba-qr-codes.vercel.app/admin` (or any app OAuth target) auto-completes the GitHub OAuth redirect with zero clicks — github.com already trusts the session.

**Do not** try to reuse the user's real Chrome profile via `--profile Default`. agent-browser ships its own Chrome for Testing binary with a different Keychain entry, so encrypted cookies from the real profile won't decrypt.
