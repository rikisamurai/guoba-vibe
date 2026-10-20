import { useState } from 'react'

import { runAcceptance, type CheckResult } from './checks'
import { implementations } from './implementations'
import type { ImplementationSource } from './types'

const groups = {
  utf8: 'A2 · UTF-8',
  sse: 'A3 · SSE',
  provider: 'A4 · 正文',
  lifecycle: 'B1 · 生命周期',
  batch: 'C1 · 帧合并',
}
export function AcceptancePanel({ source }: { source: ImplementationSource }) {
  const [results, setResults] = useState<CheckResult[] | null>(null)
  const [running, setRunning] = useState(false)
  const directory = source === 'mine' ? 'my-chat' : 'reference-chat'
  const run = async () => {
    setRunning(true)
    try {
      setResults(await runAcceptance(implementations[source]))
    } finally {
      setRunning(false)
    }
  }
  return (
    <section className="beginner-demo practice-panel" aria-label="当前实现验收">
      <div className="practice-heading">
        <div>
          <span className="beginner-meta">验证 · 同一份代码</span>
          <h2>让边界用例检验你的实现</h2>
        </div>
        <button type="button" disabled={running} onClick={() => void run()}>
          {running ? '验收中…' : '运行当前实现验收'}
        </button>
      </div>
      <p>
        加载 <code>src/{directory}/</code>。固定字节切分与虚拟帧时钟，运行真实函数；不是网络测速。
      </p>
      <output aria-live="polite">
        {results
          ? `已通过 ${results.filter((item) => item.passed).length}/${results.length} 项 · ${source === 'mine' ? '我的实现' : '参考实现'}`
          : '尚未运行，点击验收后显示实际结果'}
      </output>
      {!results && (
        <p className="beginner-note">
          起点代码故意留有边界缺口。按 A → B → C 修复；参考通过不代表你的实现已通过。
        </p>
      )}
      {results &&
        Object.entries(groups).map(([group, title]) => {
          const checks = results.filter((item) => item.group === group)
          return (
            <details key={group} open={checks.some((item) => !item.passed)}>
              <summary>
                {title} · {checks.filter((item) => item.passed).length}/{checks.length}
              </summary>
              <ul className="practice-checks">
                {checks.map((check) => (
                  <li key={check.id}>
                    <span className={check.passed ? 'practice-pass' : 'practice-fail'}>
                      {check.passed ? '通过' : '待修复'}
                    </span>
                    <div>
                      {check.title}
                      <small>
                        src/{directory}/{check.file}
                      </small>
                      {!check.passed && (
                        <pre>
                          期望：{check.expected}
                          {'\n'}实际：{check.actual}
                        </pre>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </details>
          )
        })}
      <details>
        <summary>在终端运行同一套验收</summary>
        <pre>
          pnpm --filter stream-render-lab practice test
          {source === 'reference' ? ' --reference' : ''}
        </pre>
        <p>
          可在 test 后加 utf8、sse、provider、lifecycle 或 batch 单独验收。修改源文件后重新运行。
        </p>
      </details>
    </section>
  )
}
