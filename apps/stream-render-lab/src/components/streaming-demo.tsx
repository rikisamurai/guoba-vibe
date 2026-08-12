import { useEffect, useMemo, useRef, useState } from 'react'

import { BrowserClock } from '../engine/clock'
import { createStreamingRenderEngine } from '../engine/create-engine'
import type { RenderProfile, RenderRun, RenderSnapshot } from '../engine/types'
import { boundaryCutsReplayRecords } from '../fixtures/boundary-cuts'
import { RenderDocumentView } from '../rendering/render-document'
import { ReplaySource, type ReplayRecord } from '../replay/replay-source'

const CHALLENGERS = ['M1', 'M2', 'M3', 'M4'] as const satisfies readonly RenderProfile[]
type Challenger = (typeof CHALLENGERS)[number]
type Snapshots = Partial<Record<RenderProfile, RenderSnapshot>>

interface Props {
  ariaLabel?: string
  challengerOptions?: readonly Challenger[]
  defaultChallenger?: Challenger
  description?: string
  heading?: string
  records?: readonly ReplayRecord[]
  showDiagnostics?: boolean
}

export function StreamingDemo({
  ariaLabel,
  challengerOptions = CHALLENGERS,
  defaultChallenger = 'M4',
  description,
  heading = '一条 trace，两条 pipeline',
  records = boundaryCutsReplayRecords(),
  showDiagnostics = false,
}: Props = {}) {
  const clock = useMemo(() => new BrowserClock(), [])
  const engine = useMemo(() => createStreamingRenderEngine({ clock }), [clock])
  const runsRef = useRef(new Map<RenderProfile, RenderRun>())
  const unsubscribersRef = useRef<Array<() => void>>([])
  const generationRef = useRef(0)
  const [snapshots, setSnapshots] = useState<Snapshots>({})
  const [challenger, setChallenger] = useState<Challenger>(defaultChallenger)
  const [running, setRunning] = useState(false)

  useEffect(
    () => () => stopRuns(runsRef.current, unsubscribersRef.current, 'component unmounted'),
    [],
  )

  function stop(): void {
    generationRef.current += 1
    const generation = generationRef.current
    const stoppedRuns = [...runsRef.current.entries()]
    stopRuns(runsRef.current, unsubscribersRef.current, 'user stopped replay')
    setRunning(false)
    void Promise.all(
      stoppedRuns.map(async ([profile, run]) => ({
        profile,
        snapshot: (await run.settled).snapshot,
      })),
    ).then((results) => {
      if (generationRef.current !== generation) return
      setSnapshots(Object.fromEntries(results.map(({ profile, snapshot }) => [profile, snapshot])))
    })
  }

  function play(): void {
    if (running) return stop()
    stopRuns(runsRef.current, unsubscribersRef.current, 'superseded')
    generationRef.current += 1
    const generation = generationRef.current
    setSnapshots({})
    setRunning(true)
    const profiles: readonly RenderProfile[] = ['M0', challenger]
    const settlements = profiles.map((profile) => {
      const run = engine.start({
        source: new ReplaySource(clock, records),
        profile,
        reveal: 'direct',
        trace: 'full',
      })
      runsRef.current.set(profile, run)
      const publish = () =>
        setSnapshots((current) => ({
          ...current,
          [profile]: run.state.getSnapshot(),
        }))
      publish()
      unsubscribersRef.current.push(run.state.subscribe(publish))
      return run.settled
    })
    void Promise.all(settlements).then(() => {
      if (generationRef.current === generation) setRunning(false)
    })
  }

  return (
    <section
      className="comparison-lab"
      aria-label={ariaLabel ?? `同一 trace 的 M0 与 ${challenger} 对比`}
    >
      <header className="comparison-control">
        <div>
          <p className="eyebrow eyebrow--dark">LIVE COMPARISON</p>
          <h2>{heading}</h2>
          {description === undefined ? null : (
            <p className="comparison-description">{description}</p>
          )}
        </div>
        <fieldset aria-label="选择对照渲染阶段">
          <legend>选择对照渲染阶段</legend>
          <span>M0 baseline</span>
          {challengerOptions.map((profile) => (
            <button
              aria-pressed={challenger === profile}
              disabled={running}
              key={profile}
              onClick={() => setChallenger(profile)}
              type="button"
            >
              {profile}
            </button>
          ))}
        </fieldset>
        <button className="signal-button" type="button" onClick={play}>
          {running ? '停止样本' : '播放确定性样本'}
        </button>
      </header>
      <div className="comparison-outputs">
        {(['M0', challenger] as const).map((profile) => (
          <PipelineOutput
            key={profile}
            profile={profile}
            showDiagnostics={showDiagnostics}
            snapshot={snapshots[profile]}
          />
        ))}
      </div>
    </section>
  )
}

function PipelineOutput({
  profile,
  showDiagnostics,
  snapshot,
}: {
  profile: RenderProfile
  showDiagnostics: boolean
  snapshot: RenderSnapshot | undefined
}) {
  const answer = snapshot?.parts.find((part) => part.kind === 'answer')
  const final = snapshot?.phase === 'settled'
  return (
    <article className="workbench-output" data-profile={profile}>
      <div className="output-heading">
        <div>
          <span>PIPELINE</span>
          <strong>
            {profile} · {profile === 'M0' ? 'NAIVE' : 'ADVANCED'}
          </strong>
        </div>
        <code>
          {snapshot?.phase ?? 'ready'} / {snapshot?.outcome?.kind ?? 'pending'} / #
          {snapshot?.revision ?? 0}
        </code>
      </div>
      <div className="pipeline-metrics">
        <span>
          commits <b>{snapshot?.metrics.commits ?? 0}</b>
        </span>
        <span>
          parse work <b>{snapshot?.metrics.previewParsedCodeUnits ?? 0}</b>
        </span>
        <span>
          p95 <b>{(snapshot?.metrics.rawToVisibleP95Ms ?? 0).toFixed(1)} ms</b>
        </span>
        <span>
          heavy <b>{snapshot?.heavyMetrics.attempts ?? 0}</b>
        </span>
      </div>
      {showDiagnostics ? (
        <p className="pipeline-diagnostics">
          diagnostics · {snapshot?.diagnostics.map(({ code }) => code).join(', ') || 'none'}
        </p>
      ) : null}
      <div className="sample-answer" aria-live={final ? 'polite' : 'off'}>
        {answer ? (
          <RenderDocumentView
            document={answer.document}
            final={final}
            heavyArtifacts={snapshot?.heavyArtifacts}
            partId={answer.id}
            revision={snapshot?.revision}
            runId={snapshot?.runId}
          />
        ) : (
          <p>播放后，两侧接收相同时间点的相同 delta。</p>
        )}
      </div>
    </article>
  )
}

function stopRuns(
  runs: Map<RenderProfile, RenderRun>,
  unsubscribers: Array<() => void>,
  reason: string,
): void {
  unsubscribers.splice(0).forEach((unsubscribe) => unsubscribe())
  runs.forEach((run) => run.cancel(reason))
  runs.clear()
}
