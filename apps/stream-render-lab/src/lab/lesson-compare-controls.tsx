import type { RenderProfile } from '../engine/types'
import type { LabPlaybackStatus } from './types'

export interface LessonCompareActions {
  onPause: () => void
  onReset: () => void
  onResume: () => void
  onStart: () => void
  onStep: () => void
}

interface Props {
  actions: LessonCompareActions
  baseline: RenderProfile
  challenger: RenderProfile
  elapsedMs: number
  progress: { current: number; total: number }
  status: LabPlaybackStatus
}

export function LessonCompareControls(props: Props) {
  const { actions, baseline, challenger, elapsedMs, progress, status } = props
  const active = status === 'running' || status === 'paused'
  return (
    <section className="lesson-compare__controls" aria-label="时间对照回放控制">
      <div className="lesson-compare__actions">
        {status === 'running' ? (
          <button className="is-primary" type="button" onClick={actions.onPause}>
            暂停
          </button>
        ) : status === 'paused' ? (
          <button className="is-primary" type="button" onClick={actions.onResume}>
            继续
          </button>
        ) : (
          <button className="is-primary" type="button" onClick={actions.onStart}>
            开始回放
          </button>
        )}
        <button disabled={status === 'settled'} type="button" onClick={actions.onStep}>
          单步
        </button>
        <button type="button" onClick={actions.onReset}>
          重置
        </button>
      </div>
      <div className="lesson-compare__profiles" aria-label="对照 pipeline">
        <b data-profile={baseline}>{baseline}</b>
        <span>同一条 SSE wire</span>
        <b data-profile={challenger}>{challenger}</b>
      </div>
      <div className="lesson-compare__time" aria-live={active ? 'off' : 'polite'}>
        <strong>{formatElapsed(elapsedMs)}</strong>
        <span>
          chunk {progress.current} / {progress.total}
        </span>
      </div>
    </section>
  )
}

function formatElapsed(elapsedMs: number): string {
  return `${(Math.max(0, elapsedMs) / 1_000).toFixed(2).padStart(5, '0')}s`
}
