import { useEffect, useState } from 'react'

import { compareDelivery, INTRO_PARTS } from './models'
import type { BeginnerCallbacks } from './types'

export function IntroDemo({ onReset, onSettled }: BeginnerCallbacks) {
  const [count, setCount] = useState(0)
  const [playing, setPlaying] = useState(false)
  const state = compareDelivery(count)
  useEffect(() => {
    if (!playing || state.done) return undefined
    const timer = setTimeout(() => setCount((value) => value + 1), 400)
    return () => clearTimeout(timer)
  }, [count, playing, state.done])
  useEffect(() => {
    if (state.done) {
      setPlaying(false)
      onSettled?.([
        {
          id: 'same-answer',
          label: '两种方式最终正文相同',
          passed: state.complete === state.received,
        },
      ])
    }
  }, [state.done, state.complete, state.received, onSettled])
  const reset = () => {
    setCount(0)
    setPlaying(false)
    onReset?.()
  }
  return (
    <section className="beginner-demo" aria-label="完整返回与流式返回">
      <p className="beginner-meta">固定输入 · 模拟时间，非网络测量</p>
      <div className="beginner-panels">
        <article>
          <h2>完整返回</h2>
          <p className="beginner-answer">{state.complete || '等待完整回答…'}</p>
          <small>
            首次可见：{state.firstComplete === null ? '尚未出现' : `${state.firstComplete} ms`}
          </small>
        </article>
        <article>
          <h2>流式返回</h2>
          <p className="beginner-answer">{state.received || '等待第一段文字…'}</p>
          <small>
            首次可见：{state.firstStream === null ? '尚未出现' : `${state.firstStream} ms`}
          </small>
        </article>
      </div>
      <div className="beginner-controls">
        <button
          type="button"
          onClick={() => {
            if (state.done) reset()
            setPlaying(!playing)
          }}
        >
          {playing ? '暂停' : '运行对比'}
        </button>
        <button
          type="button"
          disabled={state.done}
          onClick={() => {
            setPlaying(false)
            setCount(count + 1)
          }}
        >
          单步
        </button>
        <button type="button" onClick={reset}>
          重置
        </button>
        <span>
          模拟进度 {count} / {INTRO_PARTS.length} · {state.elapsed} ms
        </span>
      </div>
      <p className="beginner-note" aria-live="polite">
        {state.done
          ? '最终内容和完成时间相同；流式让你更早开始阅读。'
          : '先预测：流式会让整份回答更早生成吗？'}
      </p>
    </section>
  )
}
