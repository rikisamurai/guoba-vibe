import { useRef, useState } from 'react'
import {
  buildSseTranscript,
  chatDeltas,
  createDeltaBatcher,
  FIXTURE_MARKDOWN,
  sliceBurst,
  sliceJitter,
  sliceUniform,
  splitAdversarial,
  splitUniform,
  sseDataEvents,
  StreamMarkdownP0,
  StreamMarkdownP1,
  StreamMarkdownP2,
  wireChunksToStream,
} from 'stream-render-core'
import type { ChatDelta } from 'stream-render-core'

type Content = 'adversarial' | 'uniform'
type Wire = 'jitter' | 'uniform' | 'burst'

type RendererComponent = React.ComponentType<{
  text: string
  streaming?: boolean
  mermaidLive?: boolean
  className?: string
}>

const RENDERERS: Record<'p0' | 'p1' | 'p2', RendererComponent> = {
  p0: StreamMarkdownP0,
  p1: StreamMarkdownP1,
  p2: StreamMarkdownP2,
}

export interface ReplayDemoProps {
  /** events：展示解析出的 SSE 事件流；markdown：展示渲染结果 */
  view: 'events' | 'markdown'
  content?: Content
  wire?: Wire
  speed?: number
  /** 显示策略选择控件 */
  controls?: boolean
  /** markdown 视图使用的渲染器，默认 p0 */
  renderer?: keyof typeof RENDERERS
  mermaidLive?: boolean
}

const panel: React.CSSProperties = {
  border: '1px solid var(--rp-c-divider)',
  borderRadius: 8,
  padding: 16,
  margin: '16px 0',
}
const row: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
  alignItems: 'center',
  marginBottom: 12,
}
const mono: React.CSSProperties = {
  fontFamily: 'var(--rp-font-family-mono, monospace)',
  fontSize: 12,
}

export function ReplayDemo(props: ReplayDemoProps) {
  const [content, setContent] = useState<Content>(props.content ?? 'adversarial')
  const [wire, setWire] = useState<Wire>(props.wire ?? 'jitter')
  const [speed, setSpeed] = useState(props.speed ?? 4)
  const [running, setRunning] = useState(false)
  const [text, setText] = useState('')
  const [events, setEvents] = useState<string[]>([])
  const [stats, setStats] = useState({ chunks: 0, events: 0, commits: 0 })
  const cancelRef = useRef(false)

  const play = async () => {
    if (running) {
      cancelRef.current = true
      return
    }
    cancelRef.current = false
    setRunning(true)
    setText('')
    setEvents([])
    const counts = { chunks: 0, events: 0, commits: 0 }
    setStats({ ...counts })

    const deltas =
      content === 'adversarial'
        ? splitAdversarial(FIXTURE_MARKDOWN)
        : splitUniform(FIXTURE_MARKDOWN, 3)
    const transcript = buildSseTranscript(deltas)
    const chunks =
      wire === 'jitter'
        ? sliceJitter(transcript, { seed: 42 })
        : wire === 'burst'
          ? sliceBurst(transcript)
          : sliceUniform(transcript)
    const body = wireChunksToStream(chunks, speed).pipeThrough(
      new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, ctrl) {
          counts.chunks++
          ctrl.enqueue(chunk)
        },
      }),
    )

    try {
      if (props.view === 'events') {
        for await (const data of sseDataEvents(body)) {
          if (cancelRef.current) break
          counts.events++
          setEvents((prev) => [...prev.slice(-11), data])
          setStats({ ...counts })
        }
      } else {
        const batcher = createDeltaBatcher<ChatDelta>((batch) => {
          counts.commits++
          setText((prev) => prev + batch.map((d) => d.content ?? '').join(''))
          setStats({ ...counts })
        })
        for await (const delta of chatDeltas(body)) {
          if (cancelRef.current) break
          counts.events++
          batcher.push(delta)
        }
        batcher.flush()
      }
    } finally {
      setStats({ ...counts })
      setRunning(false)
    }
  }

  return (
    <div style={panel}>
      <div style={row}>
        {(props.controls ?? false) && (
          <>
            <select value={content} onChange={(e) => setContent(e.target.value as Content)}>
              <option value="adversarial">内容：恶意切分</option>
              <option value="uniform">内容：均匀 3 字符</option>
            </select>
            <select value={wire} onChange={(e) => setWire(e.target.value as Wire)}>
              <option value="jitter">线级：jitter</option>
              <option value="uniform">线级：均匀 64B</option>
              <option value="burst">线级：burst</option>
            </select>
            <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
              <option value={1}>1x</option>
              <option value={4}>4x</option>
              <option value={16}>16x</option>
            </select>
          </>
        )}
        <button
          onClick={() => void play()}
          style={{
            padding: '4px 14px',
            borderRadius: 6,
            border: '1px solid var(--rp-c-divider)',
            background: running ? 'var(--rp-c-bg-mute)' : 'var(--rp-c-brand)',
            color: running ? 'inherit' : '#fff',
            cursor: 'pointer',
          }}
        >
          {running ? '停止' : '▶ 播放'}
        </button>
        <span style={{ ...mono, opacity: 0.7 }}>
          chunk {stats.chunks} · 事件 {stats.events}
          {props.view === 'markdown' && ` · 提交 ${stats.commits}`}
        </span>
      </div>

      {props.view === 'events' ? (
        <pre style={{ ...mono, maxHeight: 260, overflow: 'auto', margin: 0 }}>
          {events.length === 0
            ? '（点击播放，这里将逐条列出解析出的 data 载荷）'
            : events.join('\n')}
        </pre>
      ) : (
        <div style={{ maxHeight: 340, overflow: 'auto' }}>
          {text === '' ? (
            <p style={{ opacity: 0.5 }}>（点击播放，压力样本将流式渲染在这里）</p>
          ) : (
            (() => {
              const Renderer = RENDERERS[props.renderer ?? 'p0']
              return <Renderer text={text} streaming={running} mermaidLive={props.mermaidLive} />
            })()
          )}
        </div>
      )}
    </div>
  )
}
