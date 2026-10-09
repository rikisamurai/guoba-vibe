export { MiniChat, sendNonStreamingTurn } from '../../01-static-chat/solution/index'
import type { ReplayInput, VirtualClock } from '../../02-replay-clock/contract'
import type { M0Renderer, M0Snapshot } from '../../03-m0-baseline/contract'

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

export function createM0Renderer(): M0Renderer {
  let snapshot: M0Snapshot = { raw: '', visible: '', parseCount: 0 }
  return {
    push(delta) {
      const raw = snapshot.raw + delta
      snapshot = {
        raw,
        visible: raw.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'),
        parseCount: snapshot.parseCount + 1,
      }
      return snapshot
    },
    snapshot: () => snapshot,
  }
}

export interface Utf8DecodeStep {
  delta: string
  index: number
  visible: string
}

export function decodeUtf8Steps(chunks: readonly Uint8Array[]): readonly Utf8DecodeStep[] {
  const decoder = new TextDecoder()
  let visible = ''
  return chunks.map((chunk, index) => {
    const streaming = index < chunks.length - 1
    const delta = decoder.decode(chunk, { stream: streaming })
    visible += delta
    return { delta, index, visible }
  })
}

export function decodeUtf8Chunks(chunks: readonly Uint8Array[]): string {
  return decodeUtf8Steps(chunks).at(-1)?.visible ?? ''
}
