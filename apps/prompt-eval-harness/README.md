# Prompt Eval Harness

Prompt Eval Harness ranks multiple agent or prompt outputs against one explicit task, weighted rubric, and evidence record. The browser and Node 24 CLI use the same validation and scoring implementation.

## Trust boundary

This is a manual, offline evidence-ranking tool. It does not call an LLM judge, execute candidate code, verify commits, or prove that recorded evidence is true. A `ship` band means the validated manual ratings crossed the configured threshold; it is not an automated quality gate.

The harness does guarantee that it will not score a structurally invalid suite:

- Every suite needs a task, expected outcomes, uniquely identified criteria, and at least one attempt.
- Rubric weights must be finite, between 0 and 1, and total exactly 100%.
- Every rating must be finite and between 1 and 5, with non-empty evidence for every criterion.
- Unknown rating/evidence keys, duplicate IDs, empty attempts, and malformed JSON block the decision.
- Defensive scoring clamps direct invalid input, so scores cannot exceed 100 even when the scorer is called outside validation.

## Browser workflow

```bash
pnpm --filter prompt-eval-harness dev
```

Use the suite panel to inspect the task contract, import or export a complete suite JSON file, and normalize edited weights. Only valid suites are persisted in browser storage. Candidate ranking, rubric controls, and evidence inspection remain visually separate.

## CLI workflow

```bash
# Bundled suite
pnpm --filter prompt-eval-harness eval

# Any suite file
pnpm --filter prompt-eval-harness eval ./path/to/suite.json
```

The CLI exits non-zero and prints every validation error before scoring an invalid suite. Node 24 is required because the CLI imports the canonical TypeScript scorer directly.

## Suite shape

The bundled example lives in `src/eval-suite.json`. For each candidate, provide:

- `ratings[criterionId]`: a manual value from 1 to 5.
- `evidence[criterionId]`: the concrete reason or verification record supporting that rating.
- `brief` and `output`: concise context for inspection.

The bands are `ship` at 85+, `inspect` at 70–84, and `hold` below 70.

## Verification

```bash
pnpm --filter prompt-eval-harness lint
pnpm --filter prompt-eval-harness test
pnpm --filter prompt-eval-harness build
pnpm --filter prompt-eval-harness eval
```
