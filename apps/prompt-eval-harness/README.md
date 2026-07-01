# Prompt Eval Harness

Prompt Eval Harness is a small local tool for comparing multiple agent or prompt outputs against the same task.

The current quick-start suite evaluates one concrete repo task: fixing QR Vault import/export collection membership. It ranks three candidate attempts with a weighted rubric, evidence, and a final `ship` / `inspect` / `hold` band.

## Quick Start

From the repository root:

```bash
corepack enable
pnpm install

pnpm --filter prompt-eval-harness eval
pnpm --filter prompt-eval-harness dev
```

`eval` prints the scored ranking in the terminal. `dev` opens the browser UI where you can adjust rubric weights and inspect each attempt's evidence.

Common commands:

```bash
pnpm --filter prompt-eval-harness test
pnpm --filter prompt-eval-harness build
pnpm --filter prompt-eval-harness lint
```

## What To Evaluate

Use this harness when you have multiple outputs for the same task and need a repeatable way to decide which one is strongest.

Good inputs:

- Several agents fixing the same bug.
- Several prompts answering the same product or coding question.
- Several implementation plans for the same requirement.

The included suite is stored in `src/eval-suite.json` and evaluates:

- Task prompt: fix QR Vault import/export so collection membership survives Merge and Replace.
- Expected outcomes: membership round trip, malformed payload safety, regression coverage, and verification evidence.
- Attempts: three candidate responses with ratings and evidence.

## How Evaluation Works

Each attempt receives a `1-5` rating for every rubric criterion.

The harness computes:

```text
final score = sum((rating / 5) * criterion weight) / sum(weights) * 100
```

Bands:

- `ship`: score is `85` or higher.
- `inspect`: score is `70-84`.
- `hold`: score is below `70`.

The browser UI lets you change criterion weights. The terminal `eval` command uses the weights in `src/eval-suite.json`.

## Rubric

Default criteria:

| Criterion     | Default weight | Meaning                                                               |
| ------------- | -------------: | --------------------------------------------------------------------- |
| Correctness   |            45% | Does the attempt satisfy the task contract and handle key edge cases? |
| Verification  |            25% | Does it include focused tests and fresh command evidence?             |
| Repo fit      |            20% | Does it use existing project data shapes, commands, and conventions?  |
| Scope control |            10% | Does it avoid unrelated rewrites and speculative features?            |

Change the rubric in `src/eval-suite.json` when a different task needs different criteria.

## Add Your Own Suite

Edit `src/eval-suite.json`:

1. Update `task.prompt` with the exact task being evaluated.
2. Update `task.expectedOutcome` with concrete acceptance points.
3. Update `rubric` with the criteria and weights you want.
4. Add one `attempts[]` entry per candidate output.
5. For every attempt, add `ratings` and `evidence` for each criterion id.
6. Run `pnpm --filter prompt-eval-harness eval`.

This is currently a manual/offline evaluation harness. It does not call an LLM judge or run the candidate code automatically.
