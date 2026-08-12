import { beforeAll, describe, expect, it } from 'vitest'

import {
  BENCHMARK_SIZES,
  generateBenchmarkCorpus,
  growthRatios,
  runBenchmarkMatrix,
  type BenchmarkReport,
} from './index'

describe('deterministic Markdown work benchmark', () => {
  let report: BenchmarkReport

  beforeAll(async () => {
    report = await runBenchmarkMatrix()
  }, 30_000)

  it('generates reproducible corpora with the requested UTF-16 size', () => {
    const first = generateBenchmarkCorpus('checkpoint-rich', 8_192, 42)
    const second = generateBenchmarkCorpus('checkpoint-rich', 8_192, 42)

    expect(first).toBe(second)
    expect(first).toHaveLength(8_192)
    expect(first).toContain('\n\n')
    expect(generateBenchmarkCorpus('no-checkpoint', 8_192, 42)).toBe('x'.repeat(8_192))
    expect(generateBenchmarkCorpus('stable-blocks', 8_192, 42)).toHaveLength(8_192)
  })

  it('covers 8K through 64K using deterministic preview work units', () => {
    const checkpointRows = report.rows.filter((row) => row.corpus === 'checkpoint-rich')

    expect(BENCHMARK_SIZES).toEqual([8_192, 16_384, 32_768, 65_536])
    expect(checkpointRows).toHaveLength(BENCHMARK_SIZES.length * 2)
    expect(new Set(checkpointRows.map((row) => row.size))).toEqual(new Set(BENCHMARK_SIZES))
    expect(checkpointRows.every((row) => row.virtualDurationMs > 0)).toBe(true)
    expect(checkpointRows.every((row) => row.canonicalParsedCodeUnits === row.size)).toBe(true)
  })

  it('separates quadratic M2 work from near-linear checkpoint-rich M3 work', () => {
    const m2 = growthRatios(report.rows, 'M2', 'checkpoint-rich')
    const m3 = growthRatios(report.rows, 'M3', 'checkpoint-rich')

    expect(m2).toHaveLength(3)
    expect(m2.every((ratio) => ratio > 3.6 && ratio < 4.1)).toBe(true)
    expect(m3).toHaveLength(3)
    expect(m3.every((ratio) => ratio > 1.75 && ratio < 2.25)).toBe(true)
  })

  it('marks no-checkpoint M3 degradation instead of claiming suffix work', () => {
    const rows = report.rows.filter((row) => row.corpus === 'no-checkpoint')

    expect(rows.map((row) => row.size)).toEqual(BENCHMARK_SIZES)
    expect(rows.every((row) => row.mode === 'M3')).toBe(true)
    expect(rows.every((row) => row.diagnostics.no_quiescent_checkpoint > 0)).toBe(true)
    expect(rows.every((row) => row.strategies.suffix === 0)).toBe(true)
    expect(growthRatios(rows, 'M3', 'no-checkpoint').every((ratio) => ratio > 3.6)).toBe(true)
  })

  it('counts M2 React memo work separately from full parse work', () => {
    const rows = report.rows.filter((row) => row.corpus === 'stable-blocks')
    const ratios = rows
      .slice(1)
      .map((row, index) => row.memoBlockRenders / (rows[index]?.memoBlockRenders ?? 1))

    expect(rows).toHaveLength(BENCHMARK_SIZES.length)
    expect(rows.every((row) => row.mode === 'M2')).toBe(true)
    expect(rows.every((row) => row.memoBlockSkips > row.memoBlockRenders)).toBe(true)
    expect(
      rows.every((row) => row.memoBlockVisits === row.memoBlockRenders + row.memoBlockSkips),
    ).toBe(true)
    expect(growthRatios(rows, 'M2', 'stable-blocks').every((ratio) => ratio > 3.6)).toBe(true)
    expect(ratios.every((ratio) => ratio > 1.8 && ratio < 2.2)).toBe(true)
  })

  it('runs M4 heavy revisions through debounce and stale-result guards', () => {
    expect(report.heavy).toMatchObject({
      corpus: 'm4-heavy-revisions',
      deltaCount: 48,
      plannedRevisions: 48,
      attemptedRevisions: [24, 48],
      renderAttempts: 2,
      committedJobs: 1,
      supersededAttempts: 1,
      staleCommits: 0,
      finalRevision: 48,
    })
    expect(report.heavy.renderAttempts).toBeLessThan(report.heavy.deltaCount)
  })
})
