import type { RenderProfile } from '../engine/types'
import { RenderDocumentView } from '../rendering/render-document'
import { TraceList } from './trace-list'
import type { LabInspectorTab, LabState } from './types'
import { WirePanel } from './wire-panel'

const TABS: Array<{ id: LabInspectorTab; label: string }> = [
  { id: 'rendered', label: 'Rendered' },
  { id: 'wire', label: 'Raw / Wire' },
  { id: 'events', label: 'Events' },
  { id: 'blocks', label: 'IR / Blocks' },
  { id: 'metrics', label: 'Metrics' },
]

interface Props {
  active: LabInspectorTab
  baseline: RenderProfile
  challenger: RenderProfile
  state: LabState
  onTab(tab: LabInspectorTab): void
}

export function LabInspector(props: Props) {
  const profiles = [props.baseline, props.challenger] as const
  return (
    <section className="lab2-inspector">
      <div className="lab2-tabs" role="tablist" aria-label="运行检查器">
        {TABS.map((tab) => (
          <button
            aria-selected={props.active === tab.id}
            key={tab.id}
            role="tab"
            type="button"
            onClick={() => props.onTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
        <span>{props.state.status.toUpperCase()}</span>
      </div>
      <div className="lab2-inspector__body" role="tabpanel">
        {props.active === 'rendered' ? (
          <RenderedPanel profiles={profiles} state={props.state} />
        ) : props.active === 'wire' ? (
          <WirePanel state={props.state} />
        ) : props.active === 'events' ? (
          <EventsPanel state={props.state} />
        ) : props.active === 'blocks' ? (
          <BlocksPanel profiles={profiles} state={props.state} />
        ) : (
          <MetricsPanel profiles={profiles} state={props.state} />
        )}
      </div>
    </section>
  )
}

function RenderedPanel({ profiles, state }: PanelProps) {
  return (
    <div className="lab2-rendered">
      {profiles.map((profile) => {
        const snapshot = state.snapshots[profile]
        const part = snapshot?.parts.find((candidate) => candidate.kind === 'answer')
        return (
          <article key={profile}>
            <header>
              <div>
                <span>
                  {profile} · {profile === 'M0' ? 'NAIVE' : 'ADVANCED'}
                </span>
                <b>{snapshot?.phase ?? 'idle'}</b>
              </div>
              <dl aria-label={`${profile} pipeline 状态`}>
                <dt>raw</dt>
                <dd>{part?.raw.length ?? 0}</dd>
                <dt>visible</dt>
                <dd>{part?.visible.length ?? 0}</dd>
                <dt>revision</dt>
                <dd>{snapshot?.revision ?? 0}</dd>
                <dt>commits</dt>
                <dd>{snapshot?.metrics.commits ?? 0}</dd>
              </dl>
            </header>
            <div aria-live={state.status === 'settled' ? 'polite' : 'off'}>
              {part ? (
                <RenderDocumentView
                  document={part.document}
                  final={snapshot?.phase === 'settled'}
                  heavyArtifacts={snapshot?.heavyArtifacts}
                  partId={part.id}
                  revision={snapshot?.revision}
                  runId={snapshot?.runId}
                />
              ) : (
                <p className="lab2-empty">点击开始，两侧将消费同一条真实 SSE wire。</p>
              )}
            </div>
          </article>
        )
      })}
    </div>
  )
}

function EventsPanel({ state }: { state: LabState }) {
  return (
    <TraceList title={`NORMALIZED EVENTS · ${state.trace.events.length}`}>
      {state.trace.events.map((event) => (
        <li key={`${event.sourceEventOrdinal}-${event.splitIndex}`}>
          <code>
            source {event.sourceEventOrdinal}.{event.splitIndex} · {event.origin.protocol}
          </code>
          <strong>{event.event.type}</strong>
          <small>{JSON.stringify(event.event)}</small>
        </li>
      ))}
    </TraceList>
  )
}

function BlocksPanel({ profiles, state }: PanelProps) {
  return (
    <div className="lab2-rendered">
      {profiles.map((profile) => (
        <TraceList key={profile} title={`${profile} RENDER IR`}>
          {(state.snapshots[profile]?.parts ?? []).flatMap((part) =>
            part.document.blocks.map((block) => (
              <li key={`${part.id}-${block.id}`}>
                <code>{block.id}</code>
                <strong>{block.type}</strong>
                <small>
                  {block.range.start}…{block.range.end} · {part.document.work.strategy}
                </small>
              </li>
            )),
          )}
        </TraceList>
      ))}
    </div>
  )
}

function MetricsPanel({ profiles, state }: PanelProps) {
  return (
    <div className="lab2-metrics">
      {profiles.map((profile) => {
        const metrics = state.snapshots[profile]?.metrics
        return (
          <article key={profile}>
            <h3>{profile}</h3>
            <Metric label="Engine commits" value={metrics?.commits} />
            <Metric label="Parse work" value={metrics?.previewParsedCodeUnits} />
            <Metric label="Raw → visible p95" value={metrics?.rawToVisibleP95Ms} suffix=" ms" />
            <Metric label="Canonical passes" value={metrics?.canonicalParsePasses} />
          </article>
        )
      })}
    </div>
  )
}

function Metric({
  label,
  value = 0,
  suffix = '',
}: {
  label: string
  value?: number
  suffix?: string
}) {
  return (
    <p>
      <span>{label}</span>
      <b>
        {value.toFixed(value % 1 === 0 ? 0 : 1)}
        {suffix}
      </b>
    </p>
  )
}

interface PanelProps {
  profiles: readonly [RenderProfile, RenderProfile]
  state: LabState
}
