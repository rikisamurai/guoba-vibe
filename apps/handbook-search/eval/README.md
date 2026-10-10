# Handbook evaluation

This directory contains project-specific evaluation questions derived from the pinned GitLab
Handbook. It is not a generic RAG benchmark.

`reviewed/` is the human-checked set used for regression. The answerable cases contain a
canonical evidence span relative to the parsed Markdown body:

```text
commit + page path + heading path + char_start/char_end + evidence text
```

Gold labels do not contain generated chunk IDs. A chunker change therefore does not require
rewriting labels, but the new chunks still need to match the page path, complete heading path,
and overlapping evidence text. Gold spans are accepted only when `char_start >= 0`,
`char_end > char_start`, and the span length equals the evidence text length. Every checked
span was replayed against commit
`eb7f028cc25d3dd8cdfbe7b0b4f834c79a64d7cb` before inclusion.

The current set has 30 answerable questions across People, Finance, Engineering, Security,
and Product (18 English and 12 Chinese-to-English retrieval questions), plus 10 reviewed
no-answer questions with no Gold evidence. It is intentionally small enough to inspect
manually and should be expanded before setting a production release gate.

Generate additional _candidates_ from question-like source headings with:

```bash
uv run handbook-search eval-seed
```

Candidates carry `review_status: candidate` and are excluded from normal evaluation until a
human checks the question, answerability, and source span. Run the reviewed retrieval set with:

```bash
uv run handbook-search eval-run eval/reviewed
uv run handbook-search eval-answerability eval/reviewed
uv run handbook-search eval-run eval/reviewed --query-rewriter none
```

The last command is the locked ablation for measuring the value and latency cost of Chinese
query rewriting instead of assuming it helps.

`eval-run` measures retrieval against the reviewed Gold evidence. The command name
`eval-answerability` is kept for compatibility, but it now evaluates the evidence gate rather
than final answer quality. An answerable case has `retrieval_has_gold: true` only when its
current Top 10 contains Gold evidence; a no-answer case always has no Gold. The report compares
that result with `gate_accepts` and records `true_accept`, `false_accept`, `false_reject`, or
`true_reject`, including aggregate false-accept and false-reject counts.

This evaluation does not measure whether a Qwen answer is correct, complete, or fully supported
by its citations.

The evidence text is adapted from the GitLab Handbook and remains subject to GitLab's
CC BY-SA 4.0 content license and attribution requirements.
