import type { AbProfileReport } from './ab-types'
import { describeProfileOutcome, formatLowerIsBetterChange } from './profile-change'
import { ProfileCorrectnessView } from './profile-correctness-view'
import { profileLabel } from './profile-options'
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
  const labels = {
    baselineLabel: profileLabel(report.baseline.profile, report.baseline.resolvedProfile),
    challengerLabel: profileLabel(report.challenger.profile, report.challenger.resolvedProfile),
  }
  const headline =
    report.correctRuns === report.runs.length
      ? describeProfileOutcome(
          [commits.direction, parse.direction],
          labels.baselineLabel,
          labels.challengerLabel,
        )
      : '正确性未通过，先修复内容再判断收益'
  return (
    <section className="profile-results">
      <header>
        <div>
          <p className="eyebrow eyebrow--cyan">
            A/B RESULT · {production ? 'PRODUCTION' : 'DEVELOPMENT'}
          </p>
          <h2>{headline}</h2>
          <p>{report.runs.length / 2} 组测量完成；两组固定文本、分片和计划到达时间一致。</p>
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
      <ProfileCorrectnessView report={report} />
      <div className="profile-conclusion">
        <strong>结论</strong>
        <p>
          {labels.challengerLabel} 相对 {labels.baselineLabel} 的 engine commits{' '}
          <b>{commits.sentence}</b>，preview parse work <b>{parse.sentence}</b>
          ；raw→visible p95 <b>{latency.sentence}</b>。
        </p>
        <p>
          工作量是实际计数；延迟是本次浏览器回放实测，受机器负载影响，不代表真实网络或模型耗时。M2–M4
          是累积策略，比较相邻版本更容易解释差异。
        </p>
      </div>
      <div className="profile-result-cards">
        <ResultCard
          {...labels}
          label="ENGINE COMMITS"
          baseline={report.baseline.commits}
          challenger={report.challenger.commits}
          suffix=""
          question="更新是否被显示帧合并？"
        />
        <ResultCard
          {...labels}
          label="PARSE WORK"
          baseline={report.baseline.parseWork}
          challenger={report.challenger.parseWork}
          suffix=" code units"
          question="全文被重复处理多少次？"
        />
        <ResultCard
          {...labels}
          label="RAW → VISIBLE P95"
          baseline={report.baseline.rawToVisibleP95Ms}
          challenger={report.challenger.rawToVisibleP95Ms}
          suffix=" ms"
          question="批处理付出了多少延迟？"
        />
        <ResultCard
          {...labels}
          label="LONG TASKS"
          baseline={report.baseline.longTasks}
          challenger={report.challenger.longTasks}
          suffix=""
          question="主线程是否超过 50ms？"
          unsupported={!report.baseline.longTasksSupported || !report.challenger.longTasksSupported}
        />
        <ResultCard
          {...labels}
          label="FIRST VISIBLE"
          baseline={report.baseline.firstVisibleMs ?? 0}
          challenger={report.challenger.firstVisibleMs ?? 0}
          suffix=" ms"
          question="从回放开始到首个非空引擎快照？"
          unsupported={
            report.baseline.firstVisibleMs === null || report.challenger.firstVisibleMs === null
          }
        />
        <ResultCard
          {...labels}
          label="HEAVY JOBS"
          baseline={report.baseline.heavyJobs}
          challenger={report.challenger.heavyJobs}
          suffix=""
          question="M4 增强渲染额外启动了多少重型任务？"
          descriptive
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
  baselineLabel,
  challengerLabel,
  unsupported = false,
  descriptive = false,
}: {
  baseline: number
  baselineLabel: string
  challenger: number
  challengerLabel: string
  label: string
  question: string
  suffix: string
  unsupported?: boolean
  descriptive?: boolean
}) {
  const change = unsupported
    ? { compact: 'unsupported', direction: 'unavailable' as const }
    : formatLowerIsBetterChange(baseline, challenger)
  return (
    <article>
      <small>{label}</small>
      <div>
        <span>
          {baselineLabel} <b>{unsupported ? 'unsupported' : `${format(baseline)}${suffix}`}</b>
        </span>
        <span>
          {challengerLabel} <b>{unsupported ? 'unsupported' : `${format(challenger)}${suffix}`}</b>
        </span>
      </div>
      <strong className={descriptive ? undefined : `is-${change.direction}`}>
        {descriptive ? '增强工作量，不按越少越好判断' : change.compact}
      </strong>
      <p>回答的问题：{question}</p>
    </article>
  )
}

function format(value: number): string {
  return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toFixed(value < 10 ? 1 : 0)
}
