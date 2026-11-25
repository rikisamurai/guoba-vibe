import { VirtualClock } from '../engine/clock'
import { parseCanonical, parsePreview } from '../markdown'
import type { MarkdownDiagnosticCode, ParseWork, RenderDocument } from '../markdown'
import { generateBenchmarkCorpus } from './corpus'
import type { BenchmarkConfig, BenchmarkRow } from './types'

function validateConfig(config: Required<BenchmarkConfig>): void {
  for (const [label, value] of [
    ['chunkSize', config.chunkSize],
    ['cadenceMs', config.cadenceMs],
    ['frameDurationMs', config.frameDurationMs],
  ] as const) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new RangeError(`${label} must be positive`)
    }
  }
}

export function runBenchmark(input: BenchmarkConfig): BenchmarkRow {
  const config: Required<BenchmarkConfig> = {
    seed: 20_260_806,
    chunkSize: 128,
    cadenceMs: 2,
    frameDurationMs: 16,
    ...input,
  }
  validateConfig(config)
  const source = generateBenchmarkCorpus(config.corpus, config.size, config.seed)
  const clock = new VirtualClock({ frameDuration: config.frameDurationMs })
  const diagnostics: Record<MarkdownDiagnosticCode, number> = {
    global_definition_fallback: 0,
    no_quiescent_checkpoint: 0,
    non_append_update: 0,
  }
  const strategies: Record<ParseWork['strategy'], number> = {
    full: 0,
    suffix: 0,
    'full-fallback': 0,
  }
  let raw = ''
  let previous: RenderDocument | undefined
  let framePending = false
  let previewCommits = 0
  let previewParsedCodeUnits = 0
  let memoBlockVisits = 0
  let memoBlockRenders = 0
  let memoBlockSkips = 0

  const commit = (): void => {
    framePending = false
    const priorById = new Map(previous?.blocks.map((block) => [block.id, block]))
    const next = parsePreview(raw, { mode: config.mode, previous })
    for (const block of next.blocks) {
      memoBlockVisits += 1
      if (priorById.get(block.id) === block) memoBlockSkips += 1
      else memoBlockRenders += 1
    }
    previous = next
    previewCommits += 1
    previewParsedCodeUnits += previous.work.parsedCodeUnits
    strategies[previous.work.strategy] += 1
    for (const diagnostic of previous.diagnostics) diagnostics[diagnostic.code] += 1
  }

  const chunks = Math.ceil(source.length / config.chunkSize)
  for (let index = 0; index < chunks; index += 1) {
    const chunk = source.slice(index * config.chunkSize, (index + 1) * config.chunkSize)
    clock.after((index + 1) * config.cadenceMs, () => {
      raw += chunk
      if (framePending) return
      framePending = true
      clock.frame(commit)
    })
  }
  clock.runUntilIdle()
  const canonical = parseCanonical(raw)

  return {
    ...config,
    scheduledChunks: chunks,
    previewCommits,
    previewParsedCodeUnits,
    canonicalParsedCodeUnits: canonical.work.parsedCodeUnits,
    memoBlockVisits,
    memoBlockRenders,
    memoBlockSkips,
    finalBlockCount: previous?.blocks.length ?? 0,
    virtualDurationMs: clock.now(),
    diagnostics,
    strategies,
  }
}
