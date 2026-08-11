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

export function replayText(_input: ReplayInput): Promise<void> {
  // TODO 02: schedule every chunk on the injected clock.
  return Promise.resolve()
}
