import { useEffect, useState } from 'react'

import { parseSseText, isSseRetryControl } from '../protocol/sse'
import type { BeginnerCallbacks } from './types'

const WIRE = 'data: {"text":"Hi"}\n\n'
export function SseDemo({ onReset, onSettled }: BeginnerCallbacks) {
  const [split, setSplit] = useState(10)
  const [count, setCount] = useState(0)
  const [events, setEvents] = useState<string[]>([])
  const [omitEnd, setOmitEnd] = useState(false)
  const wire = omitEnd ? WIRE.trimEnd() : WIRE
  useEffect(() => {
    let active = true
    async function run() {
      async function* input() {
        if (count >= 1) yield wire.slice(0, split)
        if (count >= 2) yield wire.slice(split)
      }
      const result: string[] = []
      for await (const event of parseSseText(input()))
        if (!isSseRetryControl(event)) result.push(event.data)
      if (active) setEvents(result)
    }
    void run()
    return () => {
      active = false
    }
  }, [count, split, wire])
  const reset = () => {
    setCount(0)
    setEvents([])
    onReset?.()
  }
  return (
    <section className="beginner-demo" aria-label="SSE 边界实验">
      <p className="beginner-meta">使用 Lab 的 SSE 解析器 · ↵ 表示换行 · 正文是 JSON 字符串</p>
      <label className="beginner-range">
        切在第 {split} 字符之后
        <input
          type="range"
          min="1"
          max="17"
          value={split}
          aria-label="事件切分位置"
          onChange={(event) => {
            reset()
            setSplit(Number(event.target.value))
          }}
        />
      </label>
      <label>
        <input
          type="checkbox"
          checked={omitEnd}
          onChange={(event) => {
            reset()
            setOmitEnd(event.target.checked)
          }}
        />{' '}
        故障：去掉结尾空行
      </label>
      <div className="beginner-panels">
        <article>
          <h2>两次读取</h2>
          <pre>{wire.slice(0, split).replaceAll('\n', '↵')}</pre>
          <pre>{wire.slice(split).replaceAll('\n', '↵')}</pre>
        </article>
        <article>
          <h2>已经派发的事件</h2>
          <pre>{events.join('\n') || '尚无完整事件'}</pre>
          <p>
            已读 {count} / 2 段 · 事件 {events.length} 条
          </p>
        </article>
      </div>
      <div className="beginner-controls">
        <button type="button" disabled={count === 2} onClick={() => setCount(count + 1)}>
          读取下一段
        </button>
        <button type="button" onClick={reset}>
          重置
        </button>
        <button
          type="button"
          disabled={count !== 2}
          onClick={() =>
            onSettled?.([
              {
                id: 'sse-boundary',
                label: omitEnd ? '缺少空行时不派发半条事件' : '两段数据拼出一条完整事件',
                passed: events.length === (omitEnd ? 0 : 1),
              },
            ])
          }
        >
          核对结果
        </button>
      </div>
      <p className="beginner-note" aria-live="polite">
        {count === 2 && omitEnd
          ? '连接结束不是事件分隔符；缺少空行的事件被丢弃。'
          : '读取次数与事件数量不必相同。先拼出完整事件，再解析里面的 JSON。'}
      </p>
    </section>
  )
}
