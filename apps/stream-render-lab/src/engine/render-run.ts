import type { HeavyCoordinatorFactory } from '../heavy/types'
import { sequenceEvents } from '../protocol/sequence'
import type { InternalEnvelope, RunOutcome } from '../protocol/types'
import { createEventAcceptor } from './accept-event'
import type { Cancel, EngineClock } from './clock'
import { deferred } from './deferred'
import { RunHeavyRuntime } from './heavy-runtime'
import { RunModel } from './run-model'
import { createStore } from './store'
import type { InspectionSnapshot, RenderRun, RunPhase, RunResult, StartRenderInput } from './types'

export function createRenderRun(
  runId: string,
  clock: EngineClock,
  input: StartRenderInput,
  createHeavyCoordinator: HeavyCoordinatorFactory,
): RenderRun {
  const model = new RunModel(runId, input.profile)
  const store = createStore(model.snapshot('connecting'))
  const completion = deferred<RunResult>()
  const trace: InternalEnvelope[] = []
  const abortController = new AbortController()
  let phase: RunPhase = 'connecting'
  let outcome: RunOutcome | undefined
  let cancelFrame: Cancel | null = null
  let settling = false,
    settled = false
  const heavy = new RunHeavyRuntime(
    runId,
    input.profile,
    clock,
    createHeavyCoordinator,
    (artifact, metrics) => {
      if (settled || settling) return
      model.commitHeavy(artifact)
      model.setHeavyMetrics(metrics)
      publish()
    },
  )

  function reconcileHeavy(): void {
    heavy.reconcile(runId, model.snapshot(phase, outcome).parts)
    model.setHeavyMetrics(heavy.inspect())
  }

  function commitPreview(): void {
    const startedAt = clock.now()
    model.commitPreview(input.reveal, startedAt)
    model.recordParseDuration('preview', clock.now() - startedAt)
  }

  function publish(): void {
    store.publish(model.snapshot(phase, outcome))
  }

  function scheduleFrame(): void {
    if (cancelFrame !== null || settled || settling) return
    cancelFrame = clock.frame(() => {
      cancelFrame = null
      commitPreview()
      reconcileHeavy()
      publish()
      if (outcome && !model.hasBacklog()) void settle()
      else if (model.hasBacklog()) scheduleFrame()
    })
  }

  async function settle(): Promise<void> {
    if (settled || settling || outcome === undefined) return
    settling = true
    cancelFrame?.()
    cancelFrame = null
    phase = 'settling'
    const canonicalStartedAt = clock.now()
    model.commitCanonical(canonicalStartedAt)
    model.recordParseDuration('canonical', clock.now() - canonicalStartedAt)
    publish()
    if (outcome.kind === 'cancelled') {
      heavy.cancel()
      model.replaceHeavy([], heavy.inspect())
    } else {
      try {
        const finalHeavy = await heavy.finalize(
          runId,
          model.snapshot(phase, outcome).parts,
          abortController.signal,
        )
        model.replaceHeavy(finalHeavy.artifacts, finalHeavy.metrics)
      } catch (error) {
        heavy.cancel()
        model.addDiagnostic(
          'heavy_finalize_failed',
          error instanceof Error ? error.message : String(error),
        )
      }
    }
    phase = 'settled'
    settled = true
    settling = false
    const snapshot = model.snapshot(phase, outcome)
    store.publish(snapshot)
    completion.resolve({ outcome, snapshot })
  }

  const accept = createEventAcceptor({
    model,
    input,
    clock,
    trace,
    phase: () => phase,
    setPhase: (next) => {
      phase = next
    },
    setOutcome: (next) => {
      outcome = next
    },
    publish,
    scheduleFrame,
    reconcileHeavy,
    settle,
  })

  async function pump(): Promise<void> {
    try {
      for await (const envelope of sequenceEvents(input.source.open(abortController.signal))) {
        if (settled || accept(envelope)) break
      }
      if (!outcome && !settled) {
        outcome = { kind: 'truncated', cause: 'eof', retryable: true }
        model.endAllParts()
        phase = 'draining'
        publish()
        if (model.hasBacklog()) scheduleFrame()
        else await settle()
      }
    } catch (error) {
      if (settled || abortController.signal.aborted) return
      outcome = { kind: 'truncated', cause: 'transport', retryable: true }
      model.endAllParts()
      model.addDiagnostic(
        'source_transport',
        error instanceof Error ? error.message : String(error),
      )
      phase = 'draining'
      publish()
      if (model.hasBacklog()) scheduleFrame()
      else await settle()
    }
  }

  function cancel(reason?: string): void {
    if (settled) return
    if (settling) {
      abortController.abort()
      heavy.cancel()
      return
    }
    abortController.abort()
    cancelFrame?.()
    cancelFrame = null
    if (!outcome) {
      outcome = { kind: 'cancelled', by: reason === 'superseded' ? 'superseded' : 'user' }
    }
    model.endAllParts()
    void settle()
  }

  void pump()
  return {
    state: store,
    settled: completion.promise,
    cancel,
    inspect(): InspectionSnapshot {
      return { snapshot: store.getSnapshot(), trace: [...trace] }
    },
  }
}
