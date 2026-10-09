import { useState } from 'react'

import { compareBatch } from './models'
import type { BeginnerCallbacks } from './types'

const PARTS = Array.from('流式让用户更早看到已经生成的内容。')
export function BatchDemo({ onReset, onSettled }: BeginnerCallbacks) {
  const [size, setSize] = useState(4)
  const baseline = compareBatch(PARTS, 1)
  const merged = compareBatch(PARTS, size)
  return (
    <section className="beginner-demo" aria-label="合并更新实验">
      <p className="beginner-meta">按片段数量合并的教学模型 · 每段 20 ms · 非 React 性能实测</p>
      <label>
        每次合并{' '}
        <select
          value={size}
          onChange={(event) => {
            setSize(Number(event.target.value))
            onReset?.()
          }}
          aria-label="每次合并"
        >
          {[1, 2, 4, 8].map((value) => (
            <option key={value} value={value}>
              {value} 段
            </option>
          ))}
        </select>
      </label>
      <div className="beginner-panels">
        {[
          { label: '每段都更新', result: baseline },
          { label: '合并后更新', result: merged },
        ].map(({ label, result }) => (
          <article key={label}>
            <h2>{label}</h2>
            <p className="beginner-answer">{result.text}</p>
            <p>状态更新：{result.snapshots.length} 次</p>
            <small>首次显示：{result.firstVisible} ms（模拟）</small>
          </article>
        ))}
      </div>
      <div className="beginner-controls">
        <button
          type="button"
          onClick={() =>
            onSettled?.([
              {
                id: 'batch-equal',
                label: '完成时尾段也被显示，最终正文一致',
                passed: merged.snapshots.at(-1) === baseline.text,
              },
            ])
          }
        >
          核对最终内容
        </button>
      </div>
      <p className="beginner-note" aria-live="polite">
        合并减少更新，但会增加等待；最后不足 {size} 段也必须显示。
      </p>
      <details>
        <summary>看看每次实际发布了什么</summary>
        <ol>
          {merged.snapshots.map((snapshot) => (
            <li key={snapshot}>{snapshot}</li>
          ))}
        </ol>
      </details>
    </section>
  )
}
