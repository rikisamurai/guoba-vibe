import { useState } from 'react'

import { decodeSplit } from './models'
import type { BeginnerCallbacks } from './types'

const TEXT = '你好🌊'
export function ByteDemo({ onReset, onSettled }: BeginnerCallbacks) {
  const [split, setSplit] = useState(1)
  const state = decodeSplit(TEXT, split)
  return (
    <section className="beginner-demo" aria-label="UTF-8 拆包实验">
      <p>原文：{TEXT} · 真实 TextEncoder / TextDecoder · 共 10 字节</p>
      <label className="beginner-range">
        切在第 {split} 字节之后
        <input
          aria-label="字节切分位置"
          type="range"
          min="1"
          max="9"
          value={split}
          onChange={(event) => {
            setSplit(Number(event.target.value))
            onReset?.()
          }}
        />
      </label>
      <div className="beginner-panels">
        <article>
          <h2>两次读到的字节</h2>
          <pre>{state.first.join(' ')}</pre>
          <pre>{state.second.join(' ')}</pre>
        </article>
        <article>
          <h2>解码后的文字</h2>
          <p>
            每次新建解码器：<strong>{state.wrong}</strong>
          </p>
          <p>
            保留同一个解码器：<strong>{state.correct}</strong>
          </p>
          <small>第一次增量解码：{state.head || '空字符串，等待剩余字节'}</small>
        </article>
      </div>
      <div className="beginner-controls">
        <button
          type="button"
          onClick={() =>
            onSettled?.([
              { id: 'utf8-equal', label: '跨片段解码后与原文一致', passed: state.correct === TEXT },
            ])
          }
        >
          核对原文
        </button>
      </div>
      <p className="beginner-note" aria-live="polite">
        {state.wrong === TEXT
          ? '这次恰好切在字符边界；试试相邻位置。'
          : '一个字符被拆成两段；stream: true 会保留尚未凑齐的字节。'}
      </p>
    </section>
  )
}
