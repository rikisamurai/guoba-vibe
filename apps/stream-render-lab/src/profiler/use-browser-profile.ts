import type { ProfilerOnRenderCallback } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { BrowserClock } from '../engine/clock'
import { createStreamingRenderEngine } from '../engine/create-engine'
import type { RenderRun, RenderSnapshot } from '../engine/types'
import { boundaryCutsReplayRecords } from '../fixtures/boundary-cuts'
import { ReplaySource } from '../replay/replay-source'
import {
  buildBrowserProfileReport,
  type BrowserProfileReport,
  type ReactRenderSample,
} from './profile-report'

export type { BrowserProfileReport } from './profile-report'

interface BrowserProfileState {
  snapshot: RenderSnapshot | null
  report: BrowserProfileReport | null
  sampling: boolean
  onRender: ProfilerOnRenderCallback
  run: () => void
}

const PROFILE_REPETITIONS = 5
const PROFILE_WARMUPS = 1

export function useBrowserProfile(): BrowserProfileState {
  const clock = useMemo(() => new BrowserClock(), [])
  const engine = useMemo(() => createStreamingRenderEngine({ clock }), [clock])
  const runRef = useRef<RenderRun | null>(null)
  const unsubscribeRef = useRef<(() => void) | null>(null)
  const observerRef = useRef<PerformanceObserver | null>(null)
  const generationRef = useRef(0)
  const startedAtRef = useRef(0)
  const samplingRef = useRef(false)
  const measuringRef = useRef(false)
  const currentCommitsRef = useRef<ReactRenderSample[]>([])
  const allCommitsRef = useRef<ReactRenderSample[]>([])
  const runTotalsRef = useRef<number[]>([])
  const [snapshot, setSnapshot] = useState<RenderSnapshot | null>(null)
  const [report, setReport] = useState<BrowserProfileReport | null>(null)
  const [sampling, setSampling] = useState(false)

  const stop = useCallback((reason: string) => {
    generationRef.current += 1
    samplingRef.current = false
    measuringRef.current = false
    unsubscribeRef.current?.()
    unsubscribeRef.current = null
    runRef.current?.cancel(reason)
    runRef.current = null
    observerRef.current?.disconnect()
    observerRef.current = null
  }, [])

  const onRender = useCallback<ProfilerOnRenderCallback>(
    (_id, _phase, actualDuration, _baseDuration, _startTime, commitTime) => {
      if (!samplingRef.current || !measuringRef.current) return
      const sample = {
        at: Math.max(0, commitTime - startedAtRef.current),
        duration: Math.max(0, actualDuration),
      }
      currentCommitsRef.current.push(sample)
      allCommitsRef.current.push(sample)
    },
    [],
  )

  const run = useCallback(() => {
    stop('superseded')
    const generation = generationRef.current
    allCommitsRef.current = []
    runTotalsRef.current = []
    samplingRef.current = true
    setSampling(true)
    setReport(null)

    void (async () => {
      let finalSnapshot: RenderSnapshot | null = null
      let observer: LongTaskObserver | null = null
      const runCount = PROFILE_WARMUPS + PROFILE_REPETITIONS
      for (let index = 0; index < runCount; index += 1) {
        measuringRef.current = index >= PROFILE_WARMUPS
        if (index === PROFILE_WARMUPS) {
          observer = observeLongTasks(clock.now())
          observerRef.current = observer.instance
        }
        currentCommitsRef.current = []
        startedAtRef.current = clock.now()
        const nextRun = engine.start({
          source: new ReplaySource(clock, boundaryCutsReplayRecords()),
          profile: 'production',
          reveal: 'direct',
          trace: 'full',
        })
        runRef.current = nextRun
        setSnapshot(nextRun.state.getSnapshot())
        unsubscribeRef.current = nextRun.state.subscribe(() => {
          setSnapshot(nextRun.state.getSnapshot())
        })
        // oxlint-disable-next-line no-await-in-loop -- repeats are intentionally serialized
        const result = await nextRun.settled
        // oxlint-disable-next-line no-await-in-loop -- include the final normal React commit
        await waitForFrame(clock)
        if (generationRef.current !== generation) return
        unsubscribeRef.current?.()
        unsubscribeRef.current = null
        finalSnapshot = result.snapshot
        if (measuringRef.current) {
          runTotalsRef.current.push(
            currentCommitsRef.current.reduce((total, sample) => total + sample.duration, 0),
          )
        }
      }
      if (!finalSnapshot || !observer || generationRef.current !== generation) return
      observer.takeRecords()
      observer.instance?.disconnect()
      observerRef.current = null
      runRef.current = null
      samplingRef.current = false
      measuringRef.current = false
      setReport(
        buildBrowserProfileReport({
          metrics: finalSnapshot.metrics,
          allCommits: allCommitsRef.current,
          lastRunCommits: currentCommitsRef.current,
          runRenderTotalsMs: runTotalsRef.current,
          longTasks: observer.entries,
          longTaskSupported: observer.instance !== null,
        }),
      )
      setSampling(false)
    })()
  }, [clock, engine, stop])

  useEffect(() => {
    run()
    return () => stop('component unmounted')
  }, [run, stop])

  return { snapshot, report, sampling, onRender, run }
}

interface LongTaskObserver {
  entries: PerformanceEntry[]
  instance: PerformanceObserver | null
  takeRecords(): void
}

function observeLongTasks(startedAt: number): LongTaskObserver {
  const entries: PerformanceEntry[] = []
  if (!PerformanceObserver.supportedEntryTypes?.includes('longtask')) {
    return { entries, instance: null, takeRecords() {} }
  }
  const instance = new PerformanceObserver((list) => {
    entries.push(...list.getEntries().filter((entry) => entry.startTime >= startedAt))
  })
  instance.observe({ type: 'longtask', buffered: false })
  return {
    entries,
    instance,
    takeRecords() {
      entries.push(...instance.takeRecords().filter((entry) => entry.startTime >= startedAt))
    },
  }
}

function waitForFrame(clock: BrowserClock): Promise<void> {
  return new Promise((resolve) => clock.frame(() => resolve()))
}
