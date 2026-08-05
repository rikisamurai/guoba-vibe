/**
 * 显示调度器：把「网络到达节奏」与「用户可见节奏」解耦。
 * producer 随时 push；调度器按自己的节拍放出字符——backlog 越大
 * 放得越快（自适应），且永远按完整 grapheme 放出（不劈开
 * emoji/组合字符/代理对）。
 */
export interface DisplayScheduler {
  push(delta: string): void
  /** producer 结束：进入 draining，排空后回调 onDrained */
  finish(): void
  /** 立刻排空全部积压（取消场景） */
  flushAll(): void
  dispose(): void
}

export interface DisplaySchedulerOptions {
  /** 每次放出后回调，参数是累计的完整可见文本 */
  onEmit: (visibleText: string) => void
  onDrained?: () => void
  intervalMs?: number
  minRate?: number
  maxRate?: number
}

/** 取前 n 个 grapheme，返回 [取出, 剩余]。Intl.Segmenter 缺席时按码点降级 */
export function takeGraphemes(text: string, n: number): [string, string] {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    let count = 0
    for (const s of seg.segment(text)) {
      count++
      if (count === n) {
        const end = s.index + s.segment.length
        return [text.slice(0, end), text.slice(end)]
      }
    }
    return [text, '']
  }
  const points = [...text]
  return [points.slice(0, n).join(''), points.slice(n).join('')]
}

export function createDisplayScheduler(options: DisplaySchedulerOptions): DisplayScheduler {
  const { onEmit, onDrained, intervalMs = 33, minRate = 2, maxRate = 240 } = options
  let pending = ''
  let visible = ''
  let finished = false
  let disposed = false
  let timer: ReturnType<typeof setInterval> | null = null

  const stop = () => {
    if (timer !== null) clearInterval(timer)
    timer = null
  }

  const tick = () => {
    if (pending === '') {
      stop()
      if (finished) onDrained?.()
      return
    }
    // 自适应速率：积压越多放得越快，弱网时保持细腻，burst 后快速追平
    const rate = Math.min(maxRate, Math.max(minRate, Math.round(pending.length / 6)))
    const [taken, rest] = takeGraphemes(pending, rate)
    visible += taken
    pending = rest
    onEmit(visible)
    if (pending === '' && finished) {
      stop()
      onDrained?.()
    }
  }

  const ensureTimer = () => {
    if (timer === null && !disposed) timer = setInterval(tick, intervalMs)
  }

  return {
    push(delta) {
      pending += delta
      ensureTimer()
    },
    finish() {
      finished = true
      if (pending === '') onDrained?.()
      else ensureTimer()
    },
    flushAll() {
      visible += pending
      pending = ''
      stop()
      onEmit(visible)
      if (finished) onDrained?.()
    },
    dispose() {
      disposed = true
      stop()
    },
  }
}
