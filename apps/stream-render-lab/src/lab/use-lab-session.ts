import { useCallback, useEffect, useRef, useState } from 'react'

import { BrowserClock, type Cancel, type EngineClock } from '../engine/clock'
import { createStreamingRenderEngine } from '../engine/create-engine'
import type { RenderRun } from '../engine/types'
import { ControlledWireSession } from './controlled-source'
import type { LabConfig, LabSettledReport, LabState, LabTrace } from './types'
import { buildWireChunks } from './wire'

const EMPTY_TRACE: LabTrace = { wire: [], decoded: [], lines: [], sse: [], events: [] }
const INITIAL_STATE: LabState = {
  status: 'idle',
  progress: { current: 0, total: 0 },
  snapshots: {},
  trace: EMPTY_TRACE,
}

export function useLabSession(config: LabConfig, onSettled?: (report: LabSettledReport) => void) {
  const [state, setState] = useState<LabState>(INITIAL_STATE)
  const sessionRef = useRef<ControlledWireSession | null>(null)
  const runsRef = useRef<RenderRun[]>([])
  const unsubscribeRef = useRef<Array<() => void>>([])
  const generationRef = useRef(0)
  const settledRef = useRef(onSettled)
  const traceRef = useRef<MutableTrace>(mutableTrace())
  const tracePublishPending = useRef(false)
  settledRef.current = onSettled

  const stopCurrent = useCallback((reason: string) => {
    generationRef.current += 1
    sessionRef.current?.cancel()
    sessionRef.current = null
    unsubscribeRef.current.splice(0).forEach((unsubscribe) => unsubscribe())
    runsRef.current.splice(0).forEach((run) => run.cancel(reason))
  }, [])

  const publishTrace = useCallback(() => {
    if (tracePublishPending.current) return
    tracePublishPending.current = true
    queueMicrotask(() => {
      tracePublishPending.current = false
      const trace = traceRef.current
      setState((current) => ({
        ...current,
        trace: freezeTrace(trace),
      }))
    })
  }, [])

  const start = useCallback(() => {
    stopCurrent('superseded')
    const generation = generationRef.current
    const chunks = buildWireChunks(config)
    const clock = new CadenceClock(config.commitCadenceMs)
    const engine = createStreamingRenderEngine({ clock })
    traceRef.current = mutableTrace()
    setState({
      ...INITIAL_STATE,
      status: 'running',
      progress: { current: 0, total: chunks.length },
    })

    const session = new ControlledWireSession(clock, chunks, config.transport, {
      onStatus: (status) => setState((current) => ({ ...current, status })),
      onProgress: (current, total) =>
        setState((value) => ({ ...value, progress: { current, total } })),
      onWire: (record) => {
        traceRef.current.wire.push(record)
        publishTrace()
      },
      onDecoded: (record) => {
        traceRef.current.decoded.push(record)
        publishTrace()
      },
      onLine: (line) => {
        traceRef.current.lines.push(line)
        publishTrace()
      },
      onSse: (event) => {
        traceRef.current.sse.push(event)
        publishTrace()
      },
      onEvent: (event) => {
        traceRef.current.events.push(event)
        publishTrace()
      },
    })
    sessionRef.current = session
    const profiles = [config.baseline, config.challenger] as const
    const runs = profiles.map((profile) =>
      engine.start({
        source: session.createSource(),
        profile,
        reveal: config.reveal,
        trace: config.trace,
      }),
    )
    runsRef.current = [...runs]
    runs.forEach((run, index) => {
      const publish = () =>
        setState((current) => ({
          ...current,
          snapshots: { ...current.snapshots, [profiles[index]]: run.state.getSnapshot() },
        }))
      publish()
      unsubscribeRef.current.push(run.state.subscribe(publish))
    })
    void session.start()
    void Promise.all(runs.map((run) => run.settled)).then((results) => {
      if (generationRef.current !== generation) return
      const snapshots = Object.fromEntries(
        results.map((result, index) => [profiles[index], result.snapshot]),
      )
      setState((current) => ({ ...current, status: 'settled', snapshots }))
      const primary = results[1] ?? results[0]
      settledRef.current?.({
        runId: primary.snapshot.runId,
        outcome: primary.outcome.kind,
        snapshots,
        trace: freezeTrace(traceRef.current),
      })
    })
    return session
  }, [config, publishTrace, stopCurrent])

  const reset = useCallback(() => {
    stopCurrent('user reset')
    traceRef.current = mutableTrace()
    setState(INITIAL_STATE)
  }, [stopCurrent])

  useEffect(() => () => stopCurrent('component unmounted'), [stopCurrent])

  const step = useCallback(() => {
    let session = sessionRef.current
    if (session === null) {
      session = start()
      session.pause()
    }
    session.step()
  }, [start])

  return {
    state,
    start,
    pause: () => sessionRef.current?.pause(),
    resume: () => sessionRef.current?.resume(),
    step,
    reset,
  }
}

interface MutableTrace {
  wire: LabTrace['wire'][number][]
  decoded: LabTrace['decoded'][number][]
  lines: string[]
  sse: LabTrace['sse'][number][]
  events: LabTrace['events'][number][]
}

function mutableTrace(): MutableTrace {
  return { wire: [], decoded: [], lines: [], sse: [], events: [] }
}

function freezeTrace(trace: MutableTrace): LabTrace {
  return {
    wire: [...trace.wire],
    decoded: [...trace.decoded],
    lines: [...trace.lines],
    sse: [...trace.sse],
    events: [...trace.events],
  }
}

class CadenceClock implements EngineClock {
  private readonly browser = new BrowserClock()
  constructor(private readonly cadenceMs: number) {}
  now(): number {
    return this.browser.now()
  }
  frame(task: (timestamp: number) => void): Cancel {
    return this.browser.after(Math.max(1, this.cadenceMs), () => task(this.now()))
  }
  after(ms: number, task: () => void): Cancel {
    return this.browser.after(ms, task)
  }
}
