import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { BrowserClock } from '../engine/clock'
import { createStreamingRenderEngine } from '../engine/create-engine'
import type { RenderRun, RenderSnapshot } from '../engine/types'
import type { InternalEnvelope } from '../protocol'
import { RenderDocumentView } from '../rendering/render-document'
import { ReplaySource } from '../replay/replay-source'
import type { ChapterExperiment } from './chapter-experiments'

interface Props {
  experiment: ChapterExperiment
  slug: string
}

export function ChapterLiveInspector({ experiment, slug }: Props) {
  const clock = useMemo(() => new BrowserClock(), [])
  const engine = useMemo(() => createStreamingRenderEngine({ clock }), [clock])
  const runRef = useRef<RenderRun | undefined>(undefined)
  const unsubscribeRef = useRef<() => void>(() => undefined)
  const generationRef = useRef(0)
  const [snapshot, setSnapshot] = useState<RenderSnapshot>()
  const [traceLength, setTraceLength] = useState(0)
  const [traceRows, setTraceRows] = useState<string[]>([])
  const [running, setRunning] = useState(false)

  const dispose = useCallback((reason: string) => {
    unsubscribeRef.current()
    unsubscribeRef.current = () => undefined
    runRef.current?.cancel(reason)
    runRef.current = undefined
  }, [])

  const start = useCallback(() => {
    dispose('superseded')
    generationRef.current += 1
    const generation = generationRef.current
    const run = engine.start({
      source: new ReplaySource(clock, experiment.records),
      profile: experiment.profile,
      reveal: experiment.reveal,
      trace: experiment.trace,
    })
    runRef.current = run
    setRunning(true)
    const publish = () => {
      const inspection = run.inspect()
      setSnapshot(run.state.getSnapshot())
      setTraceLength(inspection.trace.length)
      setTraceRows(inspection.trace.slice(-5).map(formatEnvelope))
    }
    publish()
    unsubscribeRef.current = run.state.subscribe(publish)
    void run.settled.then(({ snapshot: settled }) => {
      if (generationRef.current !== generation) return
      setSnapshot(settled)
      const inspection = run.inspect()
      setTraceLength(inspection.trace.length)
      setTraceRows(inspection.trace.slice(-5).map(formatEnvelope))
      setRunning(false)
    })
  }, [clock, dispose, engine, experiment])

  useEffect(() => {
    start()
    return () => {
      generationRef.current += 1
      dispose('superseded')
    }
  }, [dispose, start])

  const answer = snapshot?.parts.find((part) => part.kind === 'answer')
  const settled = snapshot?.phase === 'settled'
  const toggle = () => {
    if (running) {
      dispose('user stopped lesson replay')
      setRunning(false)
      return
    }
    start()
  }

  return (
    <aside className="lesson-live-inspector" aria-label="本章实时检查器">
      <header>
        <div>
          <span>LIVE INSPECTOR</span>
          <strong>
            {experiment.profile} · {slug}
          </strong>
        </div>
        <code>{snapshot?.phase ?? 'ready'}</code>
      </header>
      <div className="lesson-live-output" aria-live={settled ? 'polite' : 'off'}>
        {answer === undefined ? (
          <p>正在等待第一条 delta…</p>
        ) : (
          <RenderDocumentView
            document={answer.document}
            final={settled}
            heavyArtifacts={snapshot?.heavyArtifacts}
            partId={answer.id}
            revision={snapshot?.revision}
            runId={snapshot?.runId}
          />
        )}
      </div>
      <dl>
        <Metric label="revision" value={snapshot?.revision ?? 0} />
        <Metric label="internal events" value={snapshot?.metrics.internalEvents ?? 0} />
        <Metric label="trace events" value={traceLength} />
        <Metric
          label="raw / visible"
          value={`${answer?.raw.length ?? 0} / ${answer?.visible.length ?? 0}`}
        />
        <Metric label="commits" value={snapshot?.metrics.commits ?? 0} />
        <Metric label="parse work" value={snapshot?.metrics.previewParsedCodeUnits ?? 0} />
        <Metric
          label="raw → visible p95"
          value={`${(snapshot?.metrics.rawToVisibleP95Ms ?? 0).toFixed(1)} ms`}
        />
        <Metric label="outcome" value={snapshot?.outcome?.kind ?? 'pending'} />
      </dl>
      <details className="lesson-live-trace">
        <summary>LAST INTERNAL EVENTS</summary>
        {traceRows.length === 0 ? (
          <p>等待事件…</p>
        ) : (
          <ol>
            {traceRows.map((row) => (
              <li key={row}>{row}</li>
            ))}
          </ol>
        )}
      </details>
      <div className="lesson-live-diagnostics">
        <span>DIAGNOSTICS</span>
        <p>{snapshot?.diagnostics.map(({ code }) => code).join(', ') || 'none'}</p>
      </div>
      <p className="lesson-live-observation">{experiment.observation}</p>
      <button className="signal-button" type="button" onClick={toggle}>
        {running ? '停止本章样本' : '重新运行本章样本'}
      </button>
      <Link to="/profiler">在浏览器 Profiler 中观察 ↗</Link>
    </aside>
  )
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

function formatEnvelope(envelope: InternalEnvelope): string {
  const origin = envelope.origin
  const address =
    origin.protocol === 'responses'
      ? `seq ${origin.sequenceNumber}`
      : origin.protocol === 'chat-completions'
        ? `choice ${origin.choiceIndex}`
        : origin.protocol === 'anthropic'
          ? `block ${origin.blockIndex ?? '—'}`
          : `record ${origin.recordIndex}`
  return `#${envelope.internalSeq} · ${origin.protocol} ${address} · ${envelope.event.type}`
}
