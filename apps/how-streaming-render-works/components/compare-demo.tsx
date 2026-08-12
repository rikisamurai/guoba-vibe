import { useRef, useState } from 'react'
import {
  buildSseTranscript,
  chatDeltas,
  createDeltaBatcher,
  FIXTURE_MARKDOWN,
  sliceJitter,
  splitAdversarial,
  StreamMarkdownP0,
  StreamMarkdownP1,
  wireChunksToStream,
} from 'stream-render-core'
import type { ChatDelta } from 'stream-render-core'

/**
 * 同一条 chunk 时间线（恶意切分 + jitter, seed 42）同时驱动
 * P0 与 P1 两个渲染器——差异只可能来自渲染策略本身。
 */
export function CompareDemo({ speed = 4 }: { speed?: number }) {
  const [text, setText] = useState('')
  const [streaming, setStreaming] = useState(false)
  const cancelRef = useRef(false)

  const play = async () => {
    if (streaming) {
      cancelRef.current = true
      return
    }
    cancelRef.current = false
    setText('')
    setStreaming(true)
    const transcript = buildSseTranscript(splitAdversarial(FIXTURE_MARKDOWN))
    const body = wireChunksToStream(sliceJitter(transcript, { seed: 42 }), speed)
    const batcher = createDeltaBatcher<ChatDelta>((batch) => {
      setText((prev) => prev + batch.map((d) => d.content ?? '').join(''))
    })
    try {
      for await (const delta of chatDeltas(body)) {
        if (cancelRef.current) break
        batcher.push(delta)
      }
      batcher.flush()
    } finally {
      setStreaming(false)
    }
  }

  const col: React.CSSProperties = {
    border: '1px solid var(--rp-c-divider)',
    borderRadius: 8,
    padding: '8px 16px',
    maxHeight: 420,
    overflow: 'auto',
    minWidth: 0,
  }
  const head: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    opacity: 0.6,
    margin: '4px 0 8px',
  }

  return (
    <div style={{ margin: '16px 0' }}>
      <button
        onClick={() => void play()}
        style={{
          padding: '4px 14px',
          borderRadius: 6,
          border: '1px solid var(--rp-c-divider)',
          background: streaming ? 'var(--rp-c-bg-mute)' : 'var(--rp-c-brand)',
          color: streaming ? 'inherit' : '#fff',
          cursor: 'pointer',
          marginBottom: 12,
        }}
      >
        {streaming ? '停止' : '▶ 同一时间线，双渲染器对比'}
      </button>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={col}>
          <div style={head}>P0 · 全文重解析</div>
          <StreamMarkdownP0 text={text} />
        </div>
        <div style={col}>
          <div style={head}>P1 · 稳定前缀 + 调度器 + 尾部修补</div>
          <StreamMarkdownP1 text={text} streaming={streaming} />
        </div>
      </div>
    </div>
  )
}
