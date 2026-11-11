export { MiniChat, sendNonStreamingTurn } from '../../01-static-chat/solution/index'
import type { ReplayInput, VirtualClock } from '../contract'

export function createVirtualClock(): VirtualClock {
  let currentTime = 0
  const tasks: Array<{ due: number; run: () => void }> = []

  return {
    now: () => currentTime,
    after(ms, task) {
      tasks.push({ due: currentTime + ms, run: task })
    },
    advanceBy(ms) {
      const target = currentTime + ms
      while (true) {
        tasks.sort((left, right) => left.due - right.due)
        const next = tasks[0]
        if (!next || next.due > target) break
        tasks.shift()
        currentTime = next.due
        next.run()
      }
      currentTime = target
    },
  }
}

export function replayText(input: ReplayInput): Promise<void> {
  if (input.chunks.length === 0) return Promise.resolve()

  return new Promise((resolve) => {
    input.chunks.forEach((chunk, index) => {
      input.clock.after(input.intervalMs * (index + 1), () => {
        input.onDelta(chunk)
        if (index === input.chunks.length - 1) resolve()
      })
    })
  })
}
