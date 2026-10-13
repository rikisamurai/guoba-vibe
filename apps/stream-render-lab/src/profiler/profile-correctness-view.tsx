import type { AbProfileReport } from './ab-types'

export function ProfileCorrectnessView({ report }: { report: AbProfileReport }) {
  const passed = report.correctRuns === report.runs.length && report.runs.length > 0
  return (
    <section className="profile-correctness" aria-label="最终正确性">
      <strong>
        {passed ? '最终内容一致 ✓' : '最终内容校验失败'} · {report.correctRuns}/{report.runs.length}{' '}
        次通过
      </strong>
      <p>
        每次都与固定输入核对 raw、visible、canonical Markdown
        结构和完成状态。高亮、公式等增强结果不在此等价校验内。
      </p>
      {!passed ? (
        <details open>
          <summary>未通过的运行</summary>
          <ul>
            {report.runs
              .filter((run) => !Object.values(run.correctness).every(Boolean))
              .map((run) => (
                <li key={`${run.role}-${run.index}`}>
                  {run.role} #{run.index}：
                  {Object.entries(run.correctness)
                    .filter(([, value]) => !value)
                    .map(([key]) => key)
                    .join('、')}
                </li>
              ))}
          </ul>
        </details>
      ) : null}
    </section>
  )
}
