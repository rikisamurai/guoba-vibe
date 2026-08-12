import type {
  AbProfileReport,
  ProfileAggregate,
  ProfileLayer,
  ProfileTimelineSample,
} from './ab-types'
import { formatLowerIsBetterChange } from './profile-change'

const LAYERS: readonly ProfileLayer[] = [
  'network',
  'decode',
  'sse',
  'provider',
  'parse',
  'react',
  'heavy',
  'long-task',
]

export function ProfileResultDetail({ report }: { report: AbProfileReport }) {
  const latest = report.runs.toReversed().find((run) => run.profile === 'M1')
  return (
    <div className="profile-result-detail">
      <Timeline
        longTasksSupported={latest?.longTasksSupported ?? false}
        samples={latest?.timeline ?? []}
      />
      <RunTable report={report} />
    </div>
  )
}

function Timeline({
  longTasksSupported,
  samples,
}: {
  longTasksSupported: boolean
  samples: readonly ProfileTimelineSample[]
}) {
  const end = Math.max(1, ...samples.map((item) => item.startMs + item.durationMs))
  return (
    <article className="profile-lanes">
      <header>
        <div>
          <strong>最近一次 M1 时间线</strong>
          <span>network = synthetic replay arrival；点为事件，线段为可测 duration</span>
        </div>
      </header>
      {LAYERS.map((layer) => (
        <div className="profile-lane" key={layer}>
          <b>{layer}</b>
          {layer === 'long-task' && !longTasksSupported ? <em>unsupported</em> : null}
          {keySamples(samples.filter((item) => item.layer === layer).slice(-18)).map(
            ({ item, key }) => (
              <i
                className={`profile-segment profile-segment--${layer}`}
                key={key}
                style={{
                  left: `${(item.startMs / end) * 100}%`,
                  width: `${Math.max(0.8, (item.durationMs / end) * 100)}%`,
                }}
                title={`${item.label} · ${item.startMs.toFixed(1)}ms`}
              />
            ),
          )}
        </div>
      ))}
      <footer>
        <span>0ms</span>
        <span>{end.toFixed(0)}ms</span>
      </footer>
    </article>
  )
}

function RunTable({ report }: { report: AbProfileReport }) {
  const baseline = report.runs.filter((run) => run.profile === 'M0')
  const challenger = report.runs.filter((run) => run.profile === 'M1')
  return (
    <article className="profile-run-table">
      <header>
        <strong>{baseline.length} 次测量</strong>
        <span>CV {formatCv(report.challenger)}</span>
      </header>
      <table>
        <thead>
          <tr>
            <th>RUN</th>
            <th>M0</th>
            <th>M1</th>
            <th>DIFF</th>
          </tr>
        </thead>
        <tbody>
          {baseline.map((run, index) => {
            const next = challenger[index]
            const change = next
              ? formatLowerIsBetterChange(run.reactDurationMs, next.reactDurationMs)
              : null
            return (
              <tr key={run.index}>
                <td>{String(run.index).padStart(2, '0')}</td>
                <td>{run.reactDurationMs.toFixed(2)}ms</td>
                <td>{next?.reactDurationMs.toFixed(2) ?? '—'}ms</td>
                <td className={change ? `is-${change.direction}` : undefined}>
                  {change?.compact ?? '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </article>
  )
}

function keySamples(samples: readonly ProfileTimelineSample[]) {
  const occurrences = new Map<string, number>()
  return samples.map((item) => {
    const base = `${item.layer}:${item.startMs}:${item.durationMs}:${item.label}`
    const occurrence = occurrences.get(base) ?? 0
    occurrences.set(base, occurrence + 1)
    return { item, key: `${base}:${occurrence}` }
  })
}

function formatCv(aggregate: ProfileAggregate): string {
  return aggregate.cvPercent === null ? 'N/A' : `${aggregate.cvPercent.toFixed(1)}%`
}
