import type { CheckpointResult } from '@stream-render/contract'
import { useEffect, useMemo, useRef, useState } from 'react'

import {
  foundationCheckpoints,
  runFoundationDemo,
  type FoundationDemoId,
} from './foundation-demo-model'

interface FoundationDemoProps {
  demoId: FoundationDemoId
  onSettled: (checkpoints: readonly CheckpointResult[]) => void
}

export function FoundationDemo({ demoId, onSettled }: FoundationDemoProps) {
  const trace = useMemo(() => runFoundationDemo(demoId), [demoId])
  const frames = trace.frames
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const reported = useRef(false)
  const frame = frames[index]
  const settled = index === frames.length - 1

  useEffect(() => {
    if (!playing || settled) return undefined
    const timer = window.setTimeout(() => setIndex((current) => current + 1), 520)
    return () => window.clearTimeout(timer)
  }, [index, playing, settled])

  useEffect(() => {
    if (settled && !reported.current) {
      reported.current = true
      onSettled(foundationCheckpoints(trace, frame))
      setPlaying(false)
    }
  }, [frame, onSettled, settled, trace])

  const reset = () => {
    reported.current = false
    setPlaying(false)
    setIndex(0)
  }

  return (
    <section className="foundation-demo">
      <div className="foundation-demo__toolbar">
        <button
          type="button"
          className="foundation-demo__play"
          onClick={() => {
            if (settled) reset()
            setPlaying(true)
          }}
        >
          {playing ? '播放中…' : settled ? '重新观察' : '播放 trace'}
        </button>
        <button
          type="button"
          onClick={() => {
            if (settled) reset()
            else setIndex((current) => Math.min(current + 1, frames.length - 1))
          }}
        >
          单步
        </button>
        <button type="button" onClick={reset}>
          重置
        </button>
        <span>
          {index + 1} / {frames.length}
        </span>
      </div>

      <div className="foundation-demo__timeline" aria-label="arrival 与 visible 时间线">
        <SignalLane label="arrival" count={index + 1} total={frames.length} tone="arrival" />
        <SignalLane
          label="visible"
          count={frame.visible === '' ? 0 : index + 1}
          total={frames.length}
          tone="visible"
        />
      </div>

      <div className="foundation-demo__panels">
        <article>
          <span>RAW / WIRE</span>
          <strong>{frame.arrival}</strong>
          <pre>{frame.wire}</pre>
        </article>
        <article>
          <span>TYPED EVENT</span>
          <pre>{frame.event}</pre>
        </article>
        <article className="foundation-demo__answer">
          <span>VISIBLE</span>
          <strong aria-live="polite">{frame.visible || '等待可见内容…'}</strong>
        </article>
      </div>
      <p className="foundation-demo__note">{frame.note}</p>
    </section>
  )
}

function SignalLane({
  count,
  label,
  tone,
  total,
}: {
  count: number
  label: string
  tone: 'arrival' | 'visible'
  total: number
}) {
  return (
    <div className={`foundation-demo__lane foundation-demo__lane--${tone}`}>
      <code>{label}</code>
      <div>
        {Array.from({ length: total }, (_, index) => (
          <i key={index} data-active={index < count} />
        ))}
      </div>
    </div>
  )
}
