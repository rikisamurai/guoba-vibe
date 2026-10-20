import { useState } from 'react'

import {
  LIVE_STAGES,
  outcomeLabel,
  rawPart,
  type AssistantChatEntry,
  type LiveStage,
} from '../live/chat-model'

type InspectorTab = 'lifecycle' | 'events' | 'raw' | 'metrics'

const STAGE_LABELS: Record<LiveStage, string> = {
  connecting: 'Connecting',
  headers: 'Upstream headers',
  'first-byte': 'First byte',
  reasoning: 'First reasoning',
  content: 'Content streaming',
  draining: 'Draining',
  settled: 'Canonical settled',
}

function eventLabel(entry: AssistantChatEntry, index: number): string {
  const envelope = entry.inspection.trace[index]
  if (!envelope) return ''
  return `${envelope.internalSeq} · ${envelope.event.type}`
}

export function LiveChatInspector({ run }: { run: AssistantChatEntry | null }) {
  const [tab, setTab] = useState<InspectorTab>('lifecycle')
  return (
    <aside className="chat-inspector" aria-label="消息检查器">
      <header className="chat-inspector__header">
        <span>
          <small>MESSAGE INSPECTOR</small>
          <strong>{run ? '请求正在发生什么' : '等待一次真实请求'}</strong>
        </span>
        <em>
          {run
            ? run.snapshot.outcome
              ? outcomeLabel(run.snapshot.outcome)
              : run.snapshot.phase
            : 'IDLE'}
        </em>
      </header>
      <div className="chat-inspector__tabs" role="tablist" aria-label="检查器视图">
        {(['lifecycle', 'events', 'raw', 'metrics'] as const).map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={tab === item}
            onClick={() => setTab(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="chat-inspector__body">
        {!run ? (
          <p className="chat-inspector__empty">发送消息后，这里会保留 wire 到 React 的证据。</p>
        ) : null}
        {run && tab === 'lifecycle' ? <LifecycleView run={run} /> : null}
        {run && tab === 'events' ? <EventsView run={run} /> : null}
        {run && tab === 'raw' ? <RawView run={run} /> : null}
        {run && tab === 'metrics' ? <MetricsView run={run} /> : null}
      </div>
    </aside>
  )
}

function LifecycleView({ run }: { run: AssistantChatEntry }) {
  const current = run.lifecycle.at(-1)?.stage
  return (
    <ol className="chat-lifecycle">
      {LIVE_STAGES.map((stage) => {
        const mark = run.lifecycle.find((item) => item.stage === stage)
        const state = mark
          ? stage === current && !run.result
            ? 'current'
            : 'done'
          : run.result
            ? 'skipped'
            : 'pending'
        return (
          <li key={stage} data-state={state}>
            <i aria-hidden="true" />
            <span>
              <strong>{STAGE_LABELS[stage]}</strong>
              <small>{mark?.detail ?? state}</small>
            </span>
            <time>{mark ? `${mark.atMs.toFixed(0)}ms` : '—'}</time>
          </li>
        )
      })}
    </ol>
  )
}

function EventsView({ run }: { run: AssistantChatEntry }) {
  const start = Math.max(0, run.inspection.trace.length - 80)
  const events = run.inspection.trace.slice(start)
  return events.length === 0 ? (
    <p className="chat-inspector__empty">还没有 normalized event。</p>
  ) : (
    <ol className="chat-events">
      {events.map((envelope, index) => (
        <li key={envelope.internalSeq}>
          <span>{eventLabel(run, start + index)}</span>
          <small>{envelope.origin.protocol}</small>
        </li>
      ))}
    </ol>
  )
}

function RawView({ run }: { run: AssistantChatEntry }) {
  return (
    <div className="chat-raw">
      <strong>REASONING RAW</strong>
      <pre>{rawPart(run, 'reasoning') || '—'}</pre>
      <strong>ANSWER RAW</strong>
      <pre>{rawPart(run, 'answer') || '—'}</pre>
    </div>
  )
}

function MetricsView({ run }: { run: AssistantChatEntry }) {
  const metrics = run.snapshot.metrics
  return (
    <dl className="chat-inspector__metrics">
      <div>
        <dt>events</dt>
        <dd>{metrics.internalEvents}</dd>
      </div>
      <div>
        <dt>commits</dt>
        <dd>{metrics.commits}</dd>
      </div>
      <div>
        <dt>raw → visible p95</dt>
        <dd>{metrics.rawToVisibleP95Ms.toFixed(1)}ms</dd>
      </div>
      <div>
        <dt>preview parses</dt>
        <dd>{metrics.previewParsePasses}</dd>
      </div>
      <div>
        <dt>parse work</dt>
        <dd>{metrics.previewParsedCodeUnits}</dd>
      </div>
      <div>
        <dt>heavy jobs</dt>
        <dd>
          {run.snapshot.heavyMetrics.completed}/{run.snapshot.heavyMetrics.attempts}
        </dd>
      </div>
    </dl>
  )
}
