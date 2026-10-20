import { useState } from 'react'

import { runBenchmarkMatrix, type BenchmarkReport, type BenchmarkRow } from './index'
import { WorkCurve } from './work-curve'

function strategyLabel(row: BenchmarkRow): string {
  if (row.strategies['full-fallback'] > 0) {
    return row.strategies.suffix > 0 ? 'suffix + fallback' : 'full fallback'
  }
  return row.strategies.suffix > 0 ? 'suffix' : 'full'
}

export function StandaloneBench() {
  const [report, setReport] = useState<BenchmarkReport | null>(null)
  const [running, setRunning] = useState(false)

  const run = async () => {
    setRunning(true)
    try {
      setReport(await runBenchmarkMatrix())
    } finally {
      setRunning(false)
    }
  }

  return (
    <main className="standalone-bench">
      <header>
        <p>STREAMING RENDER LAB / ISOLATED DOCUMENT</p>
        <h1>可复现的渲染基准</h1>
        <span>VirtualClock · 128 code units/chunk · seed 20260806</span>
        <button type="button" disabled={running} onClick={() => void run()}>
          {running ? '运行中…' : '运行工作量 Bench'}
        </button>
      </header>
      <div className="bench-table-scroll">
        <table aria-label="四种渲染策略的确定性样本对比">
          <thead>
            <tr>
              <th>Corpus / Mode</th>
              <th>Size</th>
              <th>Commits</th>
              <th>Preview work</th>
              <th>Memo renders</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {report?.rows.map((row) => (
              <tr key={`${row.corpus}-${row.mode}-${row.size}`}>
                <th scope="row">
                  {row.corpus} / {row.mode}
                </th>
                <td>{row.size / 1024}K</td>
                <td>{row.previewCommits}</td>
                <td>{row.previewParsedCodeUnits.toLocaleString()}</td>
                <td>
                  {row.memoBlockRenders.toLocaleString()} / {row.memoBlockVisits.toLocaleString()}
                </td>
                <td>{strategyLabel(row)}</td>
              </tr>
            )) ?? (
              <tr>
                <td colSpan={6}>点击运行。这里不使用 wall-clock 作为 CI 门槛。</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {report ? <WorkCurve rows={report.rows} /> : null}
      {report && (
        <section className="heavy-result" aria-labelledby="heavy-result-title">
          <h2 id="heavy-result-title">M4 heavy revision acceptance</h2>
          <dl>
            <div>
              <dt>Delta / revision</dt>
              <dd>
                {report.heavy.deltaCount} / {report.heavy.plannedRevisions}
              </dd>
            </div>
            <div>
              <dt>Attempted revisions</dt>
              <dd>{report.heavy.attemptedRevisions.join(' → ')}</dd>
            </div>
            <div>
              <dt>Render / commit</dt>
              <dd>
                {report.heavy.renderAttempts} / {report.heavy.committedJobs}
              </dd>
            </div>
            <div>
              <dt>Superseded / stale commit</dt>
              <dd>
                {report.heavy.supersededAttempts} / {report.heavy.staleCommits}
              </dd>
            </div>
          </dl>
        </section>
      )}
      <footer>终态 canonical parse 单独计量；no-checkpoint 退化必须产生 diagnostic。</footer>
    </main>
  )
}
