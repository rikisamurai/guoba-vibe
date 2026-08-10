import type { RenderProfile, RenderSnapshot } from '../engine/types'
import { RenderDocumentView } from '../rendering/render-document'
import { LessonCompareControls, type LessonCompareActions } from './lesson-compare-controls'
import type { LabState, LabTimelineSnapshot } from './types'

interface Props {
  actions: LessonCompareActions
  baseline: RenderProfile
  challenger: RenderProfile
  state: LabState
  timeline: LabTimelineSnapshot
}

export function LessonComparePanel(props: Props) {
  const { actions, baseline, challenger, state, timeline } = props
  const profiles = [baseline, challenger] as const
  const rawLength = Math.max(...profiles.map((profile) => contentLength(state, profile, 'raw')))
  const timelineDuration = Math.max(timeline.plannedDurationMs, timeline.elapsedMs)
  return (
    <section className="lesson-compare" aria-label={`${baseline} 与 ${challenger} 时间对照`}>
      <LessonCompareControls
        actions={actions}
        baseline={baseline}
        challenger={challenger}
        elapsedMs={timeline.elapsedMs}
        progress={state.progress}
        status={state.status}
      />
      <div className="lesson-compare__timeline">
        <TimelineLane
          label="ARRIVAL CLOCK"
          note="orange = wire"
          points={timeline.arrivals.map(({ atMs, index }) => ({ atMs, id: index }))}
          durationMs={timelineDuration}
          value={`${timeline.arrivals.length} chunks`}
          detail={`raw ${rawLength}`}
          variant="arrival"
        />
        {profiles.map((profile) => {
          const publishes = timeline.publishes[profile] ?? []
          return (
            <TimelineLane
              key={profile}
              label={`${profile} Engine publish`}
              note={profile === 'M0' ? 'every delta' : 'batched + stable blocks'}
              points={publishes.map(({ atMs, commits, revision }) => ({
                atMs,
                id: `${revision}-${commits}`,
              }))}
              durationMs={timelineDuration}
              value={`${publishes.length} publishes`}
              detail={`last ${formatMs(publishes.at(-1)?.atMs)}`}
              variant={profile === 'M0' ? 'baseline' : 'challenger'}
            />
          )
        })}
      </div>
      <div className="lesson-compare__pipelines">
        {profiles.map((profile) => (
          <PipelineCard key={profile} profile={profile} snapshot={state.snapshots[profile]} />
        ))}
      </div>
      <footer className="lesson-compare__foot">
        <span>
          <b>观察重点：</b>raw 可以相同，visible 与 Engine publish 节奏可以不同。
        </span>
        <span>INPUT 与完整 Inspector 收进“完整实验台”</span>
      </footer>
    </section>
  )
}

function TimelineLane(props: {
  detail: string
  durationMs: number
  label: string
  note: string
  points: readonly { atMs: number; id: number | string }[]
  value: string
  variant: 'arrival' | 'baseline' | 'challenger'
}) {
  const duration = Math.max(1, props.durationMs)
  return (
    <div className="lesson-compare__lane">
      <div className="lesson-compare__lane-label">
        <b>{props.label}</b>
        <span>{props.note}</span>
      </div>
      <div
        className="lesson-compare__track"
        data-variant={props.variant}
        role="img"
        aria-label={`${props.label}: ${props.points.length} 个时间点`}
      >
        {props.points.map((point) => (
          <i key={point.id} style={{ insetInlineStart: `${(point.atMs / duration) * 100}%` }} />
        ))}
      </div>
      <div className="lesson-compare__lane-value">
        <b>{props.value}</b>
        <span>{props.detail}</span>
      </div>
    </div>
  )
}

function PipelineCard({
  profile,
  snapshot,
}: {
  profile: RenderProfile
  snapshot?: RenderSnapshot
}) {
  const answer = snapshot?.parts.find((part) => part.kind === 'answer')
  const raw = contentLengthFromSnapshot(snapshot, 'raw')
  const visible = contentLengthFromSnapshot(snapshot, 'visible')
  return (
    <article className="lesson-compare__pipeline" data-profile={profile}>
      <header>
        <strong>
          {profile} <em>{profile === 'M0' ? 'NAIVE' : 'ADVANCED'}</em>
        </strong>
        <dl>
          <Metric label="raw" value={raw} />
          <Metric label="visible" value={visible} />
          <Metric label="Engine commits" value={snapshot?.metrics.commits ?? 0} />
        </dl>
      </header>
      <div className="lesson-compare__rendered" aria-live="off">
        {answer ? (
          <RenderDocumentView
            document={answer.document}
            final={snapshot?.phase === 'settled'}
            heavyArtifacts={snapshot?.heavyArtifacts}
            partId={answer.id}
            revision={snapshot?.revision}
            runId={snapshot?.runId}
          />
        ) : (
          <p>开始回放后，这里显示当前 visible 内容。</p>
        )}
      </div>
      <div className="lesson-compare__delta">
        <span>{raw === visible ? 'raw 与 visible 已同步' : 'pending raw → visible'}</span>
        <strong>{raw === visible ? '0 chars' : `${raw - visible} chars · next frame`}</strong>
      </div>
    </article>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

function contentLength(state: LabState, profile: RenderProfile, field: 'raw' | 'visible') {
  return contentLengthFromSnapshot(state.snapshots[profile], field)
}

function contentLengthFromSnapshot(snapshot: RenderSnapshot | undefined, field: 'raw' | 'visible') {
  return snapshot?.parts.reduce((total, part) => total + part[field].length, 0) ?? 0
}

function formatMs(value: number | undefined): string {
  return value === undefined ? '—' : `${(value / 1_000).toFixed(2).padStart(5, '0')}s`
}
