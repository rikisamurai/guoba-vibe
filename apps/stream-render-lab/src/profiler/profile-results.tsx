import type { AbProfileReport } from './ab-types'
import { describeProfileOutcome, formatLowerIsBetterChange } from './profile-change'
import { ProfileResultDetail } from './profile-result-detail'

interface Props {
  onExport: () => void
  onReset: () => void
  production: boolean
  report: AbProfileReport
}

export function ProfileResults({ onExport, onReset, production, report }: Props) {
  const commits = formatLowerIsBetterChange(report.baseline.commits, report.challenger.commits)
  const parse = formatLowerIsBetterChange(report.baseline.parseWork, report.challenger.parseWork)
  const latency = formatLowerIsBetterChange(
    report.baseline.rawToVisibleP95Ms,
    report.challenger.rawToVisibleP95Ms,
  )
  const headline = describeProfileOutcome([commits.direction, parse.direction])
  return (
    <section className="profile-results">
      <header>
        <div>
          <p className="eyebrow eyebrow--cyan">
            A/B RESULT · {production ? 'PRODUCTION' : 'DEVELOPMENT'}
          </p>
          <h2>{headline}</h2>
          <p>
            {report.runs.length / 2} 组测量完成；synthetic replay arrival schedule 对两组保持一致。
          </p>
        </div>
        <div>
          <button onClick={onExport} type="button">
            导出 JSON
          </button>
          <button className="primary" onClick={onReset} type="button">
            重新采样
          </button>
        </div>
      </header>
      <div className="profile-conclusion">
        <strong>结论</strong>
        <p>
          M1 的 engine commits <b>{commits.sentence}</b>，preview parse work <b>{parse.sentence}</b>
          ；raw→visible p95 <b>{latency.sentence}</b>。
        </p>
      </div>
      <div className="profile-result-cards">
        <ResultCard
          label="ENGINE COMMITS"
          baseline={report.baseline.commits}
          challenger={report.challenger.commits}
          suffix=""
          question="更新是否被显示帧合并？"
        />
        <ResultCard
          label="PARSE WORK"
          baseline={report.baseline.parseWork}
          challenger={report.challenger.parseWork}
          suffix=" units"
          question="全文被重复处理多少次？"
        />
        <ResultCard
          label="RAW → VISIBLE P95"
          baseline={report.baseline.rawToVisibleP95Ms}
          challenger={report.challenger.rawToVisibleP95Ms}
          suffix=" ms"
          question="批处理付出了多少延迟？"
        />
        <ResultCard
          label="LONG TASKS"
          baseline={report.baseline.longTasks}
          challenger={report.challenger.longTasks}
          suffix=""
          question="主线程是否超过 50ms？"
          unsupported={!report.baseline.longTasksSupported || !report.challenger.longTasksSupported}
        />
      </div>
      <ProfileResultDetail report={report} />
    </section>
  )
}

function ResultCard({
  label,
  baseline,
  challenger,
  suffix,
  question,
  unsupported = false,
}: {
  baseline: number
  challenger: number
  label: string
  question: string
  suffix: string
  unsupported?: boolean
}) {
  const change = unsupported
    ? { compact: 'unsupported', direction: 'unavailable' as const }
    : formatLowerIsBetterChange(baseline, challenger)
  return (
    <article>
      <small>{label}</small>
      <div>
        <span>
          M0 <b>{unsupported ? 'unsupported' : `${format(baseline)}${suffix}`}</b>
        </span>
        <span>
          M1 <b>{unsupported ? 'unsupported' : `${format(challenger)}${suffix}`}</b>
        </span>
      </div>
      <strong className={`is-${change.direction}`}>{change.compact}</strong>
      <p>回答的问题：{question}</p>
    </article>
  )
}

function format(value: number): string {
  return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toFixed(value < 10 ? 1 : 0)
}
