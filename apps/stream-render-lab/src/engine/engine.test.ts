import { describe, expect, it, vi } from 'vitest'

import type {
  HeavyArtifact,
  HeavyCoordinatorFactory,
  HeavyJobSpec,
  HeavyMetrics,
} from '../heavy/types'
import { normalizeRenderIr, parseCanonical } from '../markdown'
import type { SourceEvent, StreamEvent } from '../protocol/types'
import { VirtualClock } from './clock'
import { createStreamingRenderEngine } from './create-engine'
import type { RenderProfile, StreamSource } from './types'

function source(events: StreamEvent[]): StreamSource {
  return {
    async *open() {
      for (const [sourceEventOrdinal, event] of events.entries()) {
        const item: SourceEvent = {
          sourceEventOrdinal,
          splitIndex: 0,
          origin: { protocol: 'replay', recordIndex: sourceEventOrdinal },
          event,
        }
        yield item
      }
    },
  }
}

async function waitFor(check: () => boolean): Promise<void> {
  for (let index = 0; index < 1_000; index += 1) {
    if (check()) return
    // oxlint-disable-next-line no-await-in-loop -- deliberately advances promise turns in order
    await Promise.resolve()
  }
  throw new Error('Condition did not become true')
}

const completedEvents: StreamEvent[] = [
  { type: 'response.start', responseId: 'response-1' },
  { type: 'part.start', partId: 'answer-1', kind: 'answer' },
  { type: 'part.delta', partId: 'answer-1', delta: { kind: 'text', text: 'Hello ' } },
  { type: 'part.delta', partId: 'answer-1', delta: { kind: 'text', text: '**world**' } },
  { type: 'part.end', partId: 'answer-1' },
  { type: 'response.end', outcome: { kind: 'completed', reason: 'stop' } },
]

const failingHeavyCoordinatorFactory: HeavyCoordinatorFactory = () => ({
  reconcile() {},
  async finalize(plan) {
    const job = plan[0]
    return job ? [{ job, status: 'failed' as const, error: 'invalid diagram' }] : []
  },
  cancel() {},
  inspect: () => ({
    attempts: 1,
    completed: 0,
    failed: 1,
    pending: 0,
    shikiEnqueuedCodeUnits: 0,
    durationMs: 0,
  }),
})

describe('StreamingRenderEngine', () => {
  it('drains frame-batched content before resolving settled', async () => {
    const clock = new VirtualClock()
    const engine = createStreamingRenderEngine({ clock })
    const run = engine.start({
      source: source(completedEvents),
      profile: 'M1',
      reveal: 'direct',
      trace: 'full',
    })

    await waitFor(() => run.state.getSnapshot().phase === 'draining')
    expect(run.state.getSnapshot().phase).toBe('draining')
    expect(run.state.getSnapshot().parts[0]?.visible).toBe('')

    clock.advanceFrame()
    const result = await run.settled
    expect(result.outcome).toEqual({ kind: 'completed', reason: 'stop' })
    expect(result.snapshot.parts[0]?.raw).toBe('Hello **world**')
    expect(result.snapshot.parts[0]?.visible).toBe('Hello **world**')
    expect(result.snapshot.phase).toBe('settled')
    expect(result.snapshot.metrics.rawToVisibleP95Ms).toBe(16)
    expect(clock.pendingCount).toBe(0)
  })

  it('marks iterator EOF without terminal proof as truncated', async () => {
    const clock = new VirtualClock()
    const engine = createStreamingRenderEngine({ clock })
    const run = engine.start({
      source: source(completedEvents.slice(0, 4)),
      profile: 'M0',
      reveal: 'direct',
      trace: 'summary',
    })
    const result = await run.settled
    expect(result.outcome).toEqual({ kind: 'truncated', cause: 'eof', retryable: true })
    expect(result.snapshot.parts[0]?.raw).toBe('Hello **world**')
  })

  it('coalesces M1 deltas while M0 commits every visible prefix', async () => {
    const immediateClock = new VirtualClock()
    const batchedClock = new VirtualClock()
    const immediate = createStreamingRenderEngine({ clock: immediateClock }).start({
      source: source(completedEvents),
      profile: 'M0',
      reveal: 'direct',
      trace: 'off',
    })
    const batched = createStreamingRenderEngine({ clock: batchedClock }).start({
      source: source(completedEvents),
      profile: 'M1',
      reveal: 'direct',
      trace: 'off',
    })
    await waitFor(() => batched.state.getSnapshot().phase === 'draining')
    batchedClock.advanceFrame()
    const [m0, m1] = await Promise.all([immediate.settled, batched.settled])
    expect(m1.snapshot.metrics.commits).toBeLessThan(m0.snapshot.metrics.commits)
    expect(m1.snapshot.parts[0]?.document).toEqual(m0.snapshot.parts[0]?.document)
  })

  it('flushes a known provider outcome when stop happens during drain', async () => {
    const clock = new VirtualClock()
    const run = createStreamingRenderEngine({ clock }).start({
      source: source(completedEvents),
      profile: 'M1',
      reveal: 'smooth',
      trace: 'off',
    })
    await waitFor(() => run.state.getSnapshot().phase === 'draining')
    expect(run.state.getSnapshot().phase).toBe('draining')
    run.cancel('user pressed stop')
    const result = await run.settled
    expect(result.outcome.kind).toBe('completed')
    expect(result.snapshot.parts[0]?.visible).toBe('Hello **world**')
  })

  it('keeps supersession distinct from user cancellation', async () => {
    const clock = new VirtualClock()
    const run = createStreamingRenderEngine({ clock }).start({
      source: source(completedEvents),
      profile: 'M1',
      reveal: 'direct',
      trace: 'off',
    })
    run.cancel('superseded')
    const result = await run.settled
    expect(result.outcome).toEqual({ kind: 'cancelled', by: 'superseded' })
  })

  it('maps normalized lifecycle violations to a protocol failure', async () => {
    const run = createStreamingRenderEngine({ clock: new VirtualClock() }).start({
      source: source([
        {
          type: 'part.delta',
          partId: 'missing',
          delta: { kind: 'text', text: 'orphan' },
        },
      ]),
      profile: 'M0',
      reveal: 'direct',
      trace: 'summary',
    })
    const result = await run.settled
    expect(result.outcome).toMatchObject({
      kind: 'failed',
      failure: { kind: 'protocol', code: 'lifecycle_violation' },
    })
  })

  it('rejects completion before start or while a part is still active', async () => {
    const completed = {
      type: 'response.end' as const,
      outcome: { kind: 'completed' as const, reason: 'stop' },
    }
    const beforeStart = createStreamingRenderEngine({ clock: new VirtualClock() }).start({
      source: source([completed]),
      profile: 'M0',
      reveal: 'direct',
      trace: 'off',
    })
    const openPart = createStreamingRenderEngine({ clock: new VirtualClock() }).start({
      source: source([
        { type: 'response.start', responseId: 'r' },
        { type: 'part.start', partId: 'answer', kind: 'answer' },
        completed,
      ]),
      profile: 'M0',
      reveal: 'direct',
      trace: 'off',
    })

    expect((await beforeStart.settled).outcome.kind).toBe('failed')
    const openResult = await openPart.settled
    expect(openResult.outcome.kind).toBe('failed')
    expect(openResult.snapshot.parts[0]?.ended).toBe(true)
  })

  it('keeps provider failure valid before start and closes partial parts on failure', async () => {
    const failure = {
      type: 'response.end' as const,
      outcome: {
        kind: 'failed' as const,
        failure: { kind: 'provider' as const, message: 'overloaded' },
      },
    }
    const early = createStreamingRenderEngine({ clock: new VirtualClock() }).start({
      source: source([failure]),
      profile: 'M0',
      reveal: 'direct',
      trace: 'off',
    })
    expect((await early.settled).outcome.kind).toBe('failed')

    const partial = createStreamingRenderEngine({ clock: new VirtualClock() }).start({
      source: source([
        { type: 'response.start', responseId: 'r' },
        { type: 'part.start', partId: 'answer', kind: 'answer' },
        { type: 'part.delta', partId: 'answer', delta: { kind: 'text', text: 'kept' } },
        failure,
      ]),
      profile: 'M0',
      reveal: 'direct',
      trace: 'off',
    })
    const partialResult = await partial.settled
    expect(partialResult.snapshot.parts[0]).toMatchObject({ raw: 'kept', ended: true })
  })

  it('rejects an invalid runtime profile synchronously', () => {
    const engine = createStreamingRenderEngine({ clock: new VirtualClock() })
    const invalid = {
      source: source([]),
      profile: 'M0' as const,
      reveal: 'direct' as const,
      trace: 'off' as const,
    }
    Object.defineProperty(invalid, 'profile', { value: 'M9' })
    expect(() => engine.start(invalid)).toThrow('Invalid render profile')
  })

  it('does not resolve settled until canonical heavy work finishes', async () => {
    const clock = new VirtualClock()
    const terminal = deferred<readonly HeavyArtifact[]>()
    let finalPlan: readonly HeavyJobSpec[] = []
    const metrics: HeavyMetrics = {
      attempts: 1,
      completed: 0,
      failed: 0,
      pending: 1,
      shikiEnqueuedCodeUnits: 12,
      durationMs: 3,
    }
    const createHeavyCoordinator: HeavyCoordinatorFactory = () => ({
      reconcile() {},
      async finalize(plan) {
        finalPlan = plan
        return terminal.promise
      },
      cancel() {},
      inspect: () => metrics,
    })
    const events = [...completedEvents]
    events[2] = {
      type: 'part.delta',
      partId: 'answer-1',
      delta: { kind: 'text', text: '```ts\nconst x = 1\n```' },
    }
    events.splice(3, 1)
    const run = createStreamingRenderEngine({ clock, createHeavyCoordinator }).start({
      source: source(events),
      profile: 'M4',
      reveal: 'direct',
      trace: 'off',
    })
    let resolved = false
    void run.settled.then(() => {
      resolved = true
    })
    await waitFor(() => run.state.getSnapshot().phase === 'draining')
    clock.advanceFrame()
    await waitFor(() => run.state.getSnapshot().phase === 'settling')
    expect(resolved).toBe(false)
    const job = finalPlan[0]
    expect(job?.kind).toBe('code')
    terminal.resolve(
      job
        ? [
            {
              job,
              status: 'complete',
              output: { kind: 'code', tokens: [{ content: job.source }] },
            },
          ]
        : [],
    )
    const result = await run.settled
    expect(result.snapshot.heavyArtifacts).toHaveLength(1)
    expect(result.snapshot.phase).toBe('settled')
  })

  it('can cancel a hung heavy finalizer without overwriting a proven outcome', async () => {
    const clock = new VirtualClock()
    let cancelCalls = 0
    const createHeavyCoordinator: HeavyCoordinatorFactory = () => ({
      reconcile() {},
      finalize: () => new Promise<readonly HeavyArtifact[]>(() => {}),
      cancel() {
        cancelCalls += 1
      },
      inspect: () => ({
        attempts: 1,
        completed: 0,
        failed: 0,
        pending: 1,
        shikiEnqueuedCodeUnits: 0,
        durationMs: 0,
      }),
    })
    const run = createStreamingRenderEngine({ clock, createHeavyCoordinator }).start({
      source: source(completedEvents),
      profile: 'M4',
      reveal: 'direct',
      trace: 'off',
    })
    await waitFor(() => run.state.getSnapshot().phase === 'draining')
    clock.advanceFrame()
    await waitFor(() => run.state.getSnapshot().phase === 'settling')
    run.cancel('stop waiting for heavy work')
    const result = await run.settled

    expect(result.outcome).toEqual({ kind: 'completed', reason: 'stop' })
    expect(result.snapshot.parts[0]?.visible).toBe('Hello **world**')
    expect(cancelCalls).toBe(1)
  })

  it('settles once with a diagnostic when canonical heavy work fails', async () => {
    const clock = new VirtualClock()
    const events = [...completedEvents]
    events[2] = {
      type: 'part.delta',
      partId: 'answer-1',
      delta: { kind: 'text', text: '```mermaid\ngraph TD; A-->B\n```' },
    }
    events.splice(3, 1)
    const run = createStreamingRenderEngine({
      clock,
      createHeavyCoordinator: failingHeavyCoordinatorFactory,
    }).start({
      source: source(events),
      profile: 'M4',
      reveal: 'direct',
      trace: 'off',
    })
    let settledSnapshots = 0
    run.state.subscribe(() => {
      if (run.state.getSnapshot().phase === 'settled') settledSnapshots += 1
    })
    await waitFor(() => run.state.getSnapshot().phase === 'draining')
    clock.advanceFrame()
    const result = await run.settled

    expect(result.snapshot.diagnostics.filter((item) => item.code === 'heavy_failed')).toHaveLength(
      1,
    )
    expect(settledSnapshots).toBe(1)
  })

  it('isolates throwing subscribers from the run lifecycle', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const clock = new VirtualClock()
    const run = createStreamingRenderEngine({ clock }).start({
      source: source(completedEvents),
      profile: 'M1',
      reveal: 'direct',
      trace: 'off',
    })
    run.state.subscribe(() => {
      throw new Error('observer broke')
    })
    await waitFor(() => run.state.getSnapshot().phase === 'draining')
    clock.advanceFrame()

    const result = await run.settled
    expect(result.outcome.kind).toBe('completed')
    expect(result.snapshot.phase).toBe('settled')
    expect(error).toHaveBeenCalled()
    error.mockRestore()
  })

  it('produces canonical final IR for every profile under arbitrary text partitions', async () => {
    const raw = '# Boundary 🙂\n\n| a | b |\n| - | - |\n| 1 | 2 |\n\n[x]\n\n[x]: /safe'
    const profiles: RenderProfile[] = ['M0', 'M1', 'M2', 'M3', 'M4', 'production']
    const chunkSizes = [1, 2, 3, 7, 19, raw.length]
    const oracle = normalizeRenderIr(parseCanonical(raw))

    for (const profile of profiles) {
      for (const chunkSize of chunkSizes) {
        const clock = new VirtualClock()
        const chunks: string[] = []
        for (let offset = 0; offset < raw.length; offset += chunkSize) {
          chunks.push(raw.slice(offset, offset + chunkSize))
        }
        const events: StreamEvent[] = [
          { type: 'response.start', responseId: `${profile}-${chunkSize}` },
          { type: 'part.start', partId: 'answer', kind: 'answer' },
          ...chunks.map(
            (text): StreamEvent => ({
              type: 'part.delta',
              partId: 'answer',
              delta: { kind: 'text', text },
            }),
          ),
          { type: 'part.end', partId: 'answer' },
          { type: 'response.end', outcome: { kind: 'completed', reason: 'fixture_end' } },
        ]
        const run = createStreamingRenderEngine({ clock }).start({
          source: source(events),
          profile,
          reveal: 'direct',
          trace: 'off',
        })
        if (profile !== 'M0') {
          // oxlint-disable-next-line no-await-in-loop -- each profile must reach drain before its frame
          await waitFor(() => run.state.getSnapshot().phase === 'draining')
          clock.advanceFrame()
        }
        // oxlint-disable-next-line no-await-in-loop -- compare each deterministic partition separately
        const result = await run.settled
        expect(normalizeRenderIr(result.snapshot.parts[0]?.document ?? parseCanonical(''))).toEqual(
          oracle,
        )
      }
    }
  })
})

function deferred<T>(): { promise: Promise<T>; resolve(value: T): void } {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}
