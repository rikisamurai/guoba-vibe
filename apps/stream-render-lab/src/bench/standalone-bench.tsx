import { useState } from 'react'

import { runBenchmarkMatrix, type BenchmarkReport, type BenchmarkRow } from './index'

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

interface CurveSeries {
  className: string
  label: string
  values: number[]
}

const CURVE_SIZES = ['8K', '16K', '32K', '64K'] as const

function WorkCurve({ rows }: { rows: BenchmarkRow[] }) {
  const select = (
    corpus: BenchmarkRow['corpus'],
    mode: BenchmarkRow['mode'],
    key: 'previewParsedCodeUnits' | 'memoBlockRenders',
  ) =>
    rows
      .filter((row) => row.corpus === corpus && row.mode === mode)
      .toSorted((left, right) => left.size - right.size)
      .map((row) => row[key])
  const series: CurveSeries[] = [
    {
      className: 'curve-m2',
      label: 'M2 full parse',
      values: select('checkpoint-rich', 'M2', 'previewParsedCodeUnits'),
    },
    {
      className: 'curve-m3',
      label: 'M3 suffix parse',
      values: select('checkpoint-rich', 'M3', 'previewParsedCodeUnits'),
    },
    {
      className: 'curve-memo',
      label: 'M2 memo renders',
      values: select('stable-blocks', 'M2', 'memoBlockRenders'),
    },
  ]
  return (
    <section className="work-curve" aria-labelledby="work-curve-title">
      <div>
        <h2 id="work-curve-title">Normalized growth · N doubles</h2>
        <p>log₂(work / 8K work)</p>
      </div>
      <svg
        role="img"
        aria-label="M2 parse、M3 suffix parse 与 M2 memo render 的归一化增长曲线"
        viewBox="0 0 680 210"
      >
        {[0, 1, 2, 3, 4, 5, 6].map((exponent) => {
          const y = curveY(2 ** exponent)
          return (
            <g key={exponent}>
              <line x1="52" x2="650" y1={y} y2={y} />
              <text x="8" y={y + 4}>
                {2 ** exponent}×
              </text>
            </g>
          )
        })}
        {CURVE_SIZES.map((size, index) => (
          <text key={size} textAnchor="middle" x={curveX(index)} y="198">
            {size}
          </text>
        ))}
        {series.toReversed().map((item) => (
          <g className={item.className} key={item.label}>
            <polyline points={curvePoints(item.values)} />
            {item.values.map((value, index) => (
              <circle
                key={`${item.label}-${CURVE_SIZES[index]}`}
                cx={curveX(index)}
                cy={curveY(value / (item.values[0] ?? 1))}
                r="4"
              />
            ))}
          </g>
        ))}
      </svg>
      <ul>
        {series.map((item) => (
          <li className={item.className} key={item.label}>
            {item.label}
          </li>
        ))}
      </ul>
    </section>
  )
}

function curveX(index: number): number {
  return 72 + index * 190
}

function curveY(ratio: number): number {
  return 170 - Math.log2(Math.max(1, ratio)) * 24
}

function curvePoints(values: number[]): string {
  const base = values[0] ?? 1
  return values.map((value, index) => `${curveX(index)},${curveY(value / base)}`).join(' ')
}
