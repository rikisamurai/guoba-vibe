import { VirtualClock } from '../engine/clock'
import type { RenderPart } from '../engine/types'
import { HeavyPlanBuilder } from '../heavy/plan'
import { createHeavyTaskGate } from '../heavy/task-gate'
import type { HeavyArtifact, HeavyJobSpec, HeavyOutput, HeavyWorkCoordinator } from '../heavy/types'
import { parsePreview, type RenderDocument } from '../markdown'
import type { HeavyBenchmarkResult } from './types'

const DELTA_COUNT = 48
const BURST_SIZE = DELTA_COUNT / 2
const CADENCE_MS = 12
const DEBOUNCE_MS = 180

interface Counters {
  attemptedRevisions: number[]
  committedJobs: number
  staleCommits: number
  latestRevision: number
  committedRevision: number
}

function asPart(document: RenderDocument): RenderPart {
  return {
    id: 'answer',
    kind: 'answer',
    raw: document.raw,
    visible: document.visible,
    document,
    ended: false,
  }
}

function countingCoordinator(
  clock: VirtualClock,
  counters: Counters,
): {
  coordinator: HeavyWorkCoordinator
  releaseFirst: () => void
} {
  let release: (() => void) | undefined
  let latestJob: HeavyJobSpec | undefined
  let artifact: HeavyArtifact | undefined
  const firstAttempt = new Promise<void>((resolve) => {
    release = resolve
  })
  const releaseFirst = (): void => release?.()
  const gate = createHeavyTaskGate<HeavyOutput>({
    clock,
    delayMs: DEBOUNCE_MS,
    async render(task) {
      counters.attemptedRevisions.push(task.revision)
      if (counters.attemptedRevisions.length === 1) await firstAttempt
      return { kind: 'html', html: `<svg data-revision="${task.revision}"></svg>` }
    },
    onCommit(task, output) {
      if (task.revision !== counters.latestRevision) {
        counters.staleCommits += 1
        return
      }
      counters.committedJobs += 1
      counters.committedRevision = task.revision
      if (latestJob) artifact = { job: latestJob, status: 'complete', output }
    },
  })
  return {
    coordinator: {
      reconcile(plan) {
        latestJob = plan[0]
        if (!latestJob) return
        counters.latestRevision = latestJob.revision
        gate.push(latestJob)
      },
      async finalize() {
        await gate.flush()
        return artifact ? [artifact] : []
      },
      cancel: () => gate.dispose(),
      inspect: () => ({
        attempts: counters.attemptedRevisions.length,
        completed: counters.committedJobs,
        failed: 0,
        pending: counters.latestRevision === counters.committedRevision ? 0 : 1,
        shikiEnqueuedCodeUnits: 0,
        durationMs: 0,
      }),
    },
    releaseFirst,
  }
}

async function promiseTurns(count = 4): Promise<void> {
  for (let index = 0; index < count; index += 1) {
    // oxlint-disable-next-line no-await-in-loop -- advances coordinator promise turns deterministically
    await Promise.resolve()
  }
}

export async function runHeavyBenchmark(): Promise<HeavyBenchmarkResult> {
  const clock = new VirtualClock()
  const builder = new HeavyPlanBuilder()
  const counters: Counters = {
    attemptedRevisions: [],
    committedJobs: 0,
    staleCommits: 0,
    latestRevision: 0,
    committedRevision: 0,
  }
  const { coordinator, releaseFirst } = countingCoordinator(clock, counters)
  const planned = new Set<number>()
  let raw = '```mermaid\n'
  let previous: RenderDocument | undefined
  let finalPlan: HeavyJobSpec[] = []

  const append = (index: number): void => {
    raw += `N${index}-->N${index + 1}\n`
    previous = parsePreview(raw, { mode: 'M2', previous })
    finalPlan = builder.build('m4-bench', [asPart(previous)])
    const revision = finalPlan[0]?.revision
    if (revision !== undefined) planned.add(revision)
    coordinator.reconcile(finalPlan)
    clock.advanceBy(CADENCE_MS)
  }

  for (let index = 0; index < BURST_SIZE; index += 1) append(index)
  clock.advanceBy(DEBOUNCE_MS)
  for (let index = BURST_SIZE; index < DELTA_COUNT; index += 1) append(index)
  releaseFirst()
  await promiseTurns()
  clock.advanceBy(DEBOUNCE_MS)
  await coordinator.finalize(finalPlan, new AbortController().signal)
  coordinator.cancel()

  return {
    corpus: 'm4-heavy-revisions',
    deltaCount: DELTA_COUNT,
    debounceMs: DEBOUNCE_MS,
    cadenceMs: CADENCE_MS,
    plannedRevisions: planned.size,
    attemptedRevisions: counters.attemptedRevisions,
    renderAttempts: counters.attemptedRevisions.length,
    committedJobs: counters.committedJobs,
    supersededAttempts: counters.attemptedRevisions.length - counters.committedJobs,
    staleCommits: counters.staleCommits,
    finalRevision: counters.committedRevision,
    virtualDurationMs: clock.now(),
  }
}
