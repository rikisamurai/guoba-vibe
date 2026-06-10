# AGENT.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## Addressing the User

When replying to the user, address them as Riki.

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

## 5. File Size & Splitting (`max-lines`)

oxlint enforces **max 200 lines** per source file (`error`; counts code only — blank lines and comments are skipped). Treat it as a **floor that prevents bloat, not a ceiling that proves good design** — a file under 200 can still be a mess. The limit's job is to make you _notice_ growth and decide how to decompose.

Applies to **any** source file, not just React components: a `lib`/`utils` file with too many functions should be split by concern so things are findable from directory + filename.

**When you hit 200, split by cohesion — never mechanically:**

- Extract a **cohesive** unit (sub-component, helper) that stands on its own and is named for what it is. Don't slice into `thing-part1` / `thing-part2` to beat the counter.
- Put **shared** pieces in a shared home (`components/`, `lib/`, … — the name isn't fixed) and import them. Copying the same code into two feature folders to pass the limit defeats the goal (reuse).
- Group split files into a feature/function folder so structure reads from names alone.

**Tests are exempt** (`*.test.*`, `tests/`) — they grow by case count, not complexity.

**Escape hatches** (both greppable, both reviewed):

1. One genuinely-cohesive long file → top-of-file directive **with a reason**: `/* oxlint-disable max-lines -- <reason> */`. A reasonless disable gets bounced in review; a stale one is flagged automatically.
2. A whole category (generated / vendored, e.g. shadcn `ui/`) → add it to `ignorePatterns` in that app's `.oxlintrc.json`.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
