import { finishCode, type CodeSession, renderCode, renderMath, renderMermaid } from './render-heavy'
import { createHeavyTaskGate, type HeavyTaskGate } from './task-gate'
import type {
  HeavyArtifact,
  HeavyCoordinatorContext,
  HeavyJobSpec,
  HeavyMetrics,
  HeavyOutput,
  HeavyWorkCoordinator,
} from './types'

const DELAYS = { code: 0, math: 80, mermaid: 180 } as const
const TIMEOUTS = { code: 5_000, math: 2_000, mermaid: 8_000 } as const
const SOURCE_LIMITS = { code: 200_000, math: 32_000, mermaid: 64_000 } as const

function matches(left: HeavyJobSpec | undefined, right: HeavyJobSpec): boolean {
  return (
    left?.runId === right.runId &&
    left.key === right.key &&
    left.revision === right.revision &&
    left.source === right.source
  )
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function createBrowserHeavyCoordinator(
  context: HeavyCoordinatorContext,
): HeavyWorkCoordinator {
  const gates = new Map<string, HeavyTaskGate>()
  const specs = new Map<string, HeavyJobSpec>()
  const artifacts = new Map<string, HeavyArtifact>()
  const sessions = new Map<string, CodeSession>()
  const enqueuedByKey = new Map<string, number>()
  let attempts = 0
  let shikiEnqueuedCodeUnits = 0
  let durationMs = 0
  let disposed = false

  function commit(artifact: HeavyArtifact): void {
    const current = specs.get(artifact.job.key)
    if (disposed || !current || !matches(current, artifact.job)) return
    artifacts.set(artifact.job.key, artifact)
    context.onArtifact(artifact)
  }

  async function render(job: HeavyJobSpec, signal: AbortSignal): Promise<HeavyOutput> {
    attempts += 1
    const startedAt = context.clock.now()
    try {
      if (job.source.length > SOURCE_LIMITS[job.kind]) {
        throw new RangeError(`${job.kind} source exceeds ${SOURCE_LIMITS[job.kind]} code units`)
      }
      if (job.kind === 'math') return await renderMath(job)
      if (job.kind === 'mermaid') return await renderMermaid(job, signal)
      const output = await renderCode(job, sessions, signal)
      const highlighter = await sessions.get(job.key)?.highlighter
      enqueuedByKey.set(job.key, highlighter?.enqueuedCodeUnits ?? 0)
      shikiEnqueuedCodeUnits = [...enqueuedByKey.values()].reduce(
        (total, value) => total + value,
        0,
      )
      return output
    } finally {
      durationMs += Math.max(0, context.clock.now() - startedAt)
    }
  }

  function gateFor(job: HeavyJobSpec): HeavyTaskGate {
    const current = gates.get(job.key)
    if (current) return current
    const gate = createHeavyTaskGate<HeavyOutput>({
      clock: context.clock,
      delayMs: DELAYS[job.kind],
      timeoutMs: TIMEOUTS[job.kind],
      render: (task, signal) => {
        const spec = specs.get(task.blockId)
        if (!spec) throw new Error('Heavy job disappeared')
        return render(spec, signal)
      },
      onCommit: (task, output) => {
        const spec = specs.get(task.blockId)
        if (spec) commit({ job: spec, status: 'complete', output })
      },
      onError: (task, error) => {
        const spec = specs.get(task.blockId)
        const prior = artifacts.get(task.blockId)
        if (spec)
          commit({
            job: spec,
            status: 'failed',
            error: errorMessage(error),
            ...(prior?.status === 'complete' ? { lastGood: prior.output } : {}),
          })
      },
    })
    gates.set(job.key, gate)
    return gate
  }

  function reconcile(plan: readonly HeavyJobSpec[]): void {
    if (disposed) return
    const present = new Set(plan.map((job) => job.key))
    for (const [key, gate] of gates) {
      if (!present.has(key)) {
        gate.dispose()
        gates.delete(key)
        specs.delete(key)
        artifacts.delete(key)
        sessions.delete(key)
        enqueuedByKey.delete(key)
      }
    }
    for (const job of plan) {
      specs.set(job.key, job)
      gateFor(job).push(job)
    }
  }

  async function finalizeCode(job: HeavyJobSpec): Promise<void> {
    const prior = artifacts.get(job.key)
    if (prior?.status !== 'complete') return
    try {
      const output = await finishCode(job, sessions)
      if (output) commit({ job, status: 'complete', output })
    } catch (error) {
      const lastArtifact = artifacts.get(job.key)
      commit({
        job,
        status: 'failed',
        error: errorMessage(error),
        ...(lastArtifact?.status === 'complete' ? { lastGood: lastArtifact.output } : {}),
      })
    }
  }

  function inspect(): HeavyMetrics {
    const current = [...specs.values()].map((job) => {
      const artifact = artifacts.get(job.key)
      return artifact && matches(job, artifact.job) ? artifact : undefined
    })
    return {
      attempts,
      completed: current.filter((artifact) => artifact?.status === 'complete').length,
      failed: current.filter((artifact) => artifact?.status === 'failed').length,
      pending: current.filter((artifact) => artifact === undefined).length,
      shikiEnqueuedCodeUnits,
      durationMs,
    }
  }

  return {
    reconcile,
    async finalize(plan, signal) {
      if (disposed || signal.aborted) return []
      reconcile(plan)
      const currentGates = plan.flatMap((job) => {
        const gate = gates.get(job.key)
        return gate ? [gate] : []
      })
      await Promise.all(currentGates.map((gate) => gate.flush()))
      if (disposed || signal.aborted) return []
      await Promise.all(plan.filter((job) => job.kind === 'code').map(finalizeCode))
      return plan.flatMap((job) => {
        const artifact = artifacts.get(job.key)
        return artifact && matches(job, artifact.job) ? [artifact] : []
      })
    },
    cancel() {
      if (disposed) return
      disposed = true
      gates.forEach((gate) => gate.dispose())
      gates.clear()
    },
    inspect,
  }
}
