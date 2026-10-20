import type { FrameClock, Publisher } from './types'

// Replays one answer into a publisher on virtual time, so publish.ts itself is measured
// without the render engine, React or browser frame noise.
export const FRAME_MS = 1000 / 60
const ANSWER = '流式渲染把已经收到的文字尽快交给界面，同时让每一帧只更新一次。'.repeat(4)

export interface PublishScenario {
  id: string
  label: string
  intervalMs: number
  deltaSize: number
}
export const publishScenarios: readonly PublishScenario[] = [
  { id: 'burst', label: '突发到达：每 2 ms 一段', intervalMs: 2, deltaSize: 2 },
  { id: 'slow', label: '慢速到达：每 50 ms 一段', intervalMs: 50, deltaSize: 8 },
]
export interface PublishMeasure {
  pushes: number
  publishes: number
  finalMatches: boolean
  averageWaitMs: number
  maxWaitMs: number
}
export type CreatePublisher = (show: (text: string) => void, clock: FrameClock) => Publisher

export const immediatePublisher: CreatePublisher = (show) => ({
  push: show,
  finish() {},
  cancel() {},
})

export function measurePublish(
  createPublisher: CreatePublisher,
  scenario: PublishScenario,
): PublishMeasure {
  let now = 0
  let nextId = 0
  const frames = new Map<number, { at: number; run: () => void }>()
  const shows: { at: number; length: number; text: string }[] = []
  const publisher = createPublisher((text) => shows.push({ at: now, length: text.length, text }), {
    request(run) {
      const id = ++nextId
      frames.set(id, { at: (Math.floor(now / FRAME_MS) + 1) * FRAME_MS, run })
      return id
    },
    cancel: (id) => frames.delete(id),
  })
  const runFramesUntil = (time: number) => {
    for (;;) {
      const due = [...frames].filter(([, frame]) => frame.at <= time)
      if (!due.length) return
      const at = Math.min(...due.map(([, frame]) => frame.at))
      now = at
      for (const [id, frame] of due.filter(([, item]) => item.at === at)) {
        frames.delete(id)
        frame.run()
      }
    }
  }
  const pushes: { at: number; length: number }[] = []
  for (let end = scenario.deltaSize; ; end += scenario.deltaSize) {
    const at = pushes.length * scenario.intervalMs
    runFramesUntil(at)
    now = at
    const text = ANSWER.slice(0, Math.min(end, ANSWER.length))
    pushes.push({ at, length: text.length })
    publisher.push(text)
    if (text.length === ANSWER.length) break
  }
  publisher.finish()
  runFramesUntil(Infinity)
  publisher.cancel()
  const waits = pushes.map((push) => {
    const shown = shows.find((show) => show.at >= push.at && show.length >= push.length)
    return shown ? shown.at - push.at : Number.POSITIVE_INFINITY
  })
  return {
    pushes: pushes.length,
    publishes: shows.length,
    finalMatches: shows.at(-1)?.text === ANSWER,
    averageWaitMs: round(waits.reduce((sum, wait) => sum + wait, 0) / waits.length),
    maxWaitMs: round(Math.max(...waits)),
  }
}

function round(value: number): number {
  return Number.isFinite(value) ? Math.round(value * 10) / 10 : value
}
