import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'

import { EMPTY_TRACE } from './lab-trace'
import { QuickStartGuidePanel } from './quick-start-guide-panel'
import { createQuickStartGuideRun, type QuickStartGuideRun } from './quick-start-guide-run'
import type { LabSettledReport } from './types'

interface Props {
  onRestart?: () => void
  onSettled?: (report: LabSettledReport) => void
}

export function QuickStartGuide({ onRestart, onSettled }: Props) {
  const [generation, setGeneration] = useState(0)
  const [run, setRun] = useState<QuickStartGuideRun>()

  useEffect(() => {
    const next = createQuickStartGuideRun()
    setRun(next)
    return () => next.dispose()
  }, [generation])

  if (!run) return <p className="quick-guide__loading">正在准备可重复实验…</p>
  return (
    <QuickStartGuideSession
      onReset={() => {
        onRestart?.()
        setGeneration((current) => current + 1)
      }}
      onSettled={onSettled}
      run={run}
    />
  )
}

function QuickStartGuideSession({
  onReset,
  onSettled,
  run,
}: Props & { onReset: () => void; run: QuickStartGuideRun }) {
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const reportedRunId = useRef<string | undefined>(undefined)
  const subscribe = useCallback((listener: () => void) => run.state.subscribe(listener), [run])
  const getSnapshot = useCallback(() => run.state.getSnapshot(), [run])
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  const execute = useCallback(async (task: () => Promise<void>) => {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try {
      await task()
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }, [])

  const actions = useMemo(
    () => ({
      advanceAnimationFrame: () => execute(() => run.advanceAnimationFrame()),
      finish: () => execute(() => run.finish()),
      readNextChunk: () => execute(() => run.readNextChunk()),
      reset() {
        run.dispose()
        busyRef.current = false
        setBusy(false)
        onReset()
      },
    }),
    [execute, onReset, run],
  )

  useEffect(() => {
    if (snapshot.stage !== 'settled') return
    const baseline = snapshot.pipelines.M0.renderSnapshot
    const optimized = snapshot.pipelines.M4.renderSnapshot
    if (reportedRunId.current === optimized.runId) return
    reportedRunId.current = optimized.runId
    onSettled?.({
      runId: optimized.runId,
      outcome: optimized.outcome?.kind ?? 'failed',
      snapshots: { M0: baseline, M4: optimized },
      trace: EMPTY_TRACE,
      visibleTextUpdates: {
        M0: snapshot.pipelines.M0.visibleUpdates,
        M4: snapshot.pipelines.M4.visibleUpdates,
      },
    })
  }, [onSettled, snapshot])

  return <QuickStartGuidePanel actions={actions} busy={busy} snapshot={snapshot} />
}
