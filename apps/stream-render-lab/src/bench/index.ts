import { runBenchmark } from './run-benchmark'
import { runHeavyBenchmark } from './run-heavy-benchmark'
import type { BenchmarkCorpus, BenchmarkMode, BenchmarkReport, BenchmarkRow } from './types'

export { generateBenchmarkCorpus } from './corpus'
export { runBenchmark } from './run-benchmark'
export { runHeavyBenchmark } from './run-heavy-benchmark'
export type {
  BenchmarkConfig,
  BenchmarkCorpus,
  BenchmarkMode,
  BenchmarkReport,
  BenchmarkRow,
  HeavyBenchmarkResult,
} from './types'

export const BENCHMARK_SIZES = [8_192, 16_384, 32_768, 65_536] as const

export async function runBenchmarkMatrix(): Promise<BenchmarkReport> {
  const rows: BenchmarkRow[] = []
  for (const size of BENCHMARK_SIZES) {
    rows.push(runBenchmark({ size, mode: 'M2', corpus: 'checkpoint-rich' }))
    rows.push(runBenchmark({ size, mode: 'M3', corpus: 'checkpoint-rich' }))
    rows.push(runBenchmark({ size, mode: 'M3', corpus: 'no-checkpoint' }))
    rows.push(runBenchmark({ size, mode: 'M2', corpus: 'stable-blocks' }))
  }
  return {
    generatedAt: 'deterministic',
    metric: 'parsed UTF-16 code units',
    rows,
    heavy: await runHeavyBenchmark(),
  }
}

export function growthRatios(
  rows: BenchmarkRow[],
  mode: BenchmarkMode,
  corpus: BenchmarkCorpus,
): number[] {
  const selected = rows
    .filter((row) => row.mode === mode && row.corpus === corpus)
    .toSorted((left, right) => left.size - right.size)
  return selected.slice(1).map((row, index) => {
    const previous = selected[index]
    return previous ? row.previewParsedCodeUnits / previous.previewParsedCodeUnits : 0
  })
}
