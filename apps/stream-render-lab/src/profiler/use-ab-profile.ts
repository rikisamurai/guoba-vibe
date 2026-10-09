import type { ProfilerOnRenderCallback } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { BrowserClock } from '../engine/clock'
import { createStreamingRenderEngine } from '../engine/create-engine'
import type { RenderRun, RenderSnapshot } from '../engine/types'
import type {
  AbProfile,
  AbProfileConfig,
  AbProfileReport,
  ProfileRunSample,
  ProfileTimelineSample,
} from './ab-types'
import { aggregateReport } from './aggregate-report'
import {
  appendEngineTiming,
  appendRenderTimeline,
  createEngineTimingCursor,
  observeLongTasks,
} from './profile-observation'
import { createProfileRunPlan } from './profile-run-plan'
import { createProfileSource } from './profile-wire-source'

interface ActiveMeasurement {
  commits: Array<{ at: number; duration: number }>
  measured: boolean
  profile: AbProfile
  startedAt: number
}

export interface AbProfileState {
  currentProfile: AbProfile | null
  onRender: ProfilerOnRenderCallback
  progress: { completed: number; total: number }
  report: AbProfileReport | null
  reset: () => void
  run: (config: AbProfileConfig) => void
  running: boolean
  snapshot: RenderSnapshot | null
  stop: () => void
}

export function useAbProfile(): AbProfileState {
  const clock = useMemo(() => new BrowserClock(), [])
  const engine = useMemo(() => createStreamingRenderEngine({ clock }), [clock])
  const generationRef = useRef(0)
  const runRef = useRef<RenderRun | null>(null)
  const unsubscribeRef = useRef<(() => void) | null>(null)
  const activeRef = useRef<ActiveMeasurement | null>(null)
  const [snapshot, setSnapshot] = useState<RenderSnapshot | null>(null)
  const [report, setReport] = useState<AbProfileReport | null>(null)
  const [running, setRunning] = useState(false)
  const [currentProfile, setCurrentProfile] = useState<AbProfile | null>(null)
  const [progress, setProgress] = useState({ completed: 0, total: 0 })

  const stop = useCallback(() => {
    generationRef.current += 1
    unsubscribeRef.current?.()
    unsubscribeRef.current = null
    runRef.current?.cancel('profiler stopped')
    runRef.current = null
    activeRef.current = null
    setRunning(false)
    setCurrentProfile(null)
  }, [])

  const onRender = useCallback<ProfilerOnRenderCallback>(
    (_id, _phase, actualDuration, _baseDuration, _startTime, commitTime) => {
      const active = activeRef.current
      if (!active?.measured) return
      active.commits.push({
        at: Math.max(0, commitTime - active.startedAt),
        duration: Math.max(0, actualDuration),
      })
    },
    [],
  )

  const reset = useCallback(() => {
    stop()
    setReport(null)
    setSnapshot(null)
    setProgress({ completed: 0, total: 0 })
  }, [stop])

  const run = useCallback(
    (config: AbProfileConfig) => {
      stop()
      const generation = generationRef.current
      const plan = createProfileRunPlan(config)
      const total = plan.length
      setProgress({ completed: 0, total })
      setReport(null)
      setRunning(true)
      void (async () => {
        const samples: ProfileRunSample[] = []
        let completed = 0
        for (const planned of plan) {
          if (generationRef.current !== generation) return
          // oxlint-disable-next-line no-await-in-loop -- A/B runs are intentionally isolated
          const sample = await executeRun(planned.profile, planned.cycle, planned.measured, config)
          if (generationRef.current !== generation) return
          if (sample) samples.push(sample)
          completed += 1
          setProgress({ completed, total })
        }
        setReport(aggregateReport(samples))
        setRunning(false)
        setCurrentProfile(null)
      })()

      async function executeRun(
        profile: AbProfile,
        cycle: number,
        measured: boolean,
        input: AbProfileConfig,
      ): Promise<ProfileRunSample | null> {
        const startedAt = clock.now()
        const timeline: ProfileTimelineSample[] = []
        const timingCursor = createEngineTimingCursor()
        const active: ActiveMeasurement = { profile, measured, startedAt, commits: [] }
        activeRef.current = active
        setCurrentProfile(profile)
        const longTasks = observeLongTasks(startedAt)
        const nextRun = engine.start({
          source: createProfileSource(clock, input, (item) => timeline.push(item)),
          profile,
          reveal: 'direct',
          trace: 'full',
        })
        runRef.current = nextRun
        setSnapshot(nextRun.state.getSnapshot())
        unsubscribeRef.current = nextRun.state.subscribe(() => {
          const next = nextRun.state.getSnapshot()
          appendEngineTiming(timeline, timingCursor, {
            observedAtMs: clock.now() - startedAt,
            previewParseMs: next.metrics.previewParseDurationMs,
            canonicalParseMs: next.metrics.canonicalParseDurationMs,
            heavyMs: next.heavyMetrics.durationMs,
          })
          setSnapshot(next)
        })
        const result = await nextRun.settled
        await new Promise<void>((resolve) => clock.frame(() => resolve()))
        unsubscribeRef.current?.()
        unsubscribeRef.current = null
        longTasks.stop()
        if (!measured) return null
        const elapsedMs = clock.now() - startedAt
        appendRenderTimeline(timeline, active, longTasks.entries)
        return {
          profile,
          index: cycle - input.warmups + 1,
          elapsedMs,
          snapshot: result.snapshot,
          longTasksSupported: longTasks.supported,
          reactCommits: active.commits.length,
          reactDurationMs: active.commits.reduce((duration, item) => duration + item.duration, 0),
          longTasks: longTasks.entries.length,
          timeline,
        }
      }
    },
    [clock, engine, stop],
  )

  useEffect(() => stop, [stop])
  return { currentProfile, onRender, progress, report, reset, run, running, snapshot, stop }
}
