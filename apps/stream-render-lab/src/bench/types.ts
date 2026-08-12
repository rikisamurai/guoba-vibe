import type { MarkdownDiagnosticCode, ParseWork } from '../markdown'

export type BenchmarkCorpus = 'checkpoint-rich' | 'no-checkpoint' | 'stable-blocks'
export type BenchmarkMode = 'M2' | 'M3'

export interface BenchmarkConfig {
  size: number
  mode: BenchmarkMode
  corpus: BenchmarkCorpus
  seed?: number
  chunkSize?: number
  cadenceMs?: number
  frameDurationMs?: number
}

export interface BenchmarkRow {
  size: number
  mode: BenchmarkMode
  corpus: BenchmarkCorpus
  seed: number
  chunkSize: number
  cadenceMs: number
  frameDurationMs: number
  scheduledChunks: number
  previewCommits: number
  previewParsedCodeUnits: number
  canonicalParsedCodeUnits: number
  memoBlockVisits: number
  memoBlockRenders: number
  memoBlockSkips: number
  finalBlockCount: number
  virtualDurationMs: number
  diagnostics: Record<MarkdownDiagnosticCode, number>
  strategies: Record<ParseWork['strategy'], number>
}

export interface HeavyBenchmarkResult {
  corpus: 'm4-heavy-revisions'
  deltaCount: number
  debounceMs: number
  cadenceMs: number
  plannedRevisions: number
  attemptedRevisions: number[]
  renderAttempts: number
  committedJobs: number
  supersededAttempts: number
  staleCommits: number
  finalRevision: number
  virtualDurationMs: number
}

export interface BenchmarkReport {
  generatedAt: 'deterministic'
  metric: 'parsed UTF-16 code units'
  rows: BenchmarkRow[]
  heavy: HeavyBenchmarkResult
}
