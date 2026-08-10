import { useCallback, useEffect, useRef, useState } from 'react'

import { createStreamingRenderEngine } from '../engine/create-engine'
import type { RenderRun } from '../engine/types'
import { CadenceClock } from './cadence-clock'
import { ControlledWireSession } from './controlled-source'
import { EMPTY_TRACE, freezeTrace, mutableTrace, type MutableTrace } from './lab-trace'
import { createTimelineRecorder, type LabTimelineRecorder } from './timeline-recorder'
import type { LabConfig, LabSettledReport, LabState, LabTimelineSnapshot } from './types'
import { buildWireChunks } from './wire'

const EMPTY_TIMELINE: LabTimelineSnapshot = {
  elapsedMs: 0,
  plannedDurationMs: 0,
  arrivals: [],
  publishes: {},
}
const INITIAL_STATE: LabState = {
  status: 'idle',
  progress: { current: 0, total: 0 },
  snapshots: {},
  timeline: EMPTY_TIMELINE,
  trace: EMPTY_TRACE,
}

interface LabSessionOptions {
  recordTimeline?: boolean
}

export function useLabSession(
  config: LabConfig,
  onSettled?: (report: LabSettledReport) => void,
  options: LabSessionOptions = {},
) {
  const [state, setState] = useState<LabState>(INITIAL_STATE)
  const sessionRef = useRef<ControlledWireSession | null>(null)
  const runsRef = useRef<RenderRun[]>([])
  const unsubscribeRef = useRef<Array<() => void>>([])
  const generationRef = useRef(0)
  const settledRef = useRef(onSettled)
  const traceRef = useRef<MutableTrace>(mutableTrace())
  const timelineRef = useRef<LabTimelineRecorder | null>(null)
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
        timeline: timelineRef.current?.snapshot() ?? current.timeline,
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
    timelineRef.current = options.recordTimeline
      ? createTimelineRecorder({
          clock,
          plannedDurationMs: chunks.reduce((total, chunk) => total + chunk.delayMs, 0),
        })
      : null
    traceRef.current = mutableTrace()
    setState({
      ...INITIAL_STATE,
      status: 'running',
      progress: { current: 0, total: chunks.length },
      timeline: timelineRef.current?.snapshot() ?? EMPTY_TIMELINE,
    })

    const session = new ControlledWireSession(clock, chunks, config.transport, {
      onStatus: (status) =>
        setState((current) => ({
          ...current,
          status,
          timeline: timelineRef.current?.snapshot() ?? current.timeline,
        })),
      onProgress: (current, total) =>
        setState((value) => ({ ...value, progress: { current, total } })),
      onWire: (record) => {
        timelineRef.current?.observeArrival(record)
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
      const publish = () => {
        const snapshot = run.state.getSnapshot()
        timelineRef.current?.observePublish(profiles[index], snapshot)
        setState((current) => ({
          ...current,
          snapshots: { ...current.snapshots, [profiles[index]]: snapshot },
          timeline: timelineRef.current?.snapshot() ?? current.timeline,
        }))
      }
      publish()
      unsubscribeRef.current.push(run.state.subscribe(publish))
    })
    void session.start()
    void Promise.all(runs.map((run) => run.settled)).then((results) => {
      if (generationRef.current !== generation) return
      const snapshots = Object.fromEntries(
        results.map((result, index) => [profiles[index], result.snapshot]),
      )
      setState((current) => ({
        ...current,
        status: 'settled',
        snapshots,
        timeline: timelineRef.current?.snapshot() ?? current.timeline,
      }))
      const primary = results[1] ?? results[0]
      settledRef.current?.({
        runId: primary.snapshot.runId,
        outcome: primary.outcome.kind,
        snapshots,
        trace: freezeTrace(traceRef.current),
      })
    })
    return session
  }, [config, options.recordTimeline, publishTrace, stopCurrent])

  const reset = useCallback(() => {
    stopCurrent('user reset')
    traceRef.current = mutableTrace()
    timelineRef.current = null
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
