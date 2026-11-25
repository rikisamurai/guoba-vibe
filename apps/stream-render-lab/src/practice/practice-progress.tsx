import { useEffect, useState } from 'react'

import { runAcceptance, type CheckResult } from './checks'
import { practiceGroups } from './groups'
import { implementations } from './implementations'

export function PracticeProgress() {
  const [results, setResults] = useState<CheckResult[]>([])
  const mine = implementations.mine
  // A hot update replaces `mine`, so the progress follows each saved edit.
  useEffect(() => {
    let current = true
    void runAcceptance(mine).then((checked) => {
      if (current) setResults(checked)
    })
    return () => {
      current = false
    }
  }, [mine])
  const passed = results.filter((item) => item.passed).length
  return (
    <section className="practice-progress" aria-label="我的进度">
      <strong>
        我的进度 · 已通过 {passed}/{results.length} 项
      </strong>
      <progress value={passed} max={results.length || 1} />
      <ul>
        {Object.entries(practiceGroups).map(([group, title]) => {
          const checks = results.filter((item) => item.group === group)
          const done = checks.filter((item) => item.passed).length
          return (
            <li
              key={group}
              title={title}
              className={checks.length && done === checks.length ? 'practice-pass' : undefined}
            >
              {title.split(' · ')[0]} {done}/{checks.length}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
