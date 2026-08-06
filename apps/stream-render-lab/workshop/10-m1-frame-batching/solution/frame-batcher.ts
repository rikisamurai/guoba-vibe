import type { Cancel } from '../../../src/engine/clock'
import type { FrameBatcherImplementation } from '../contract'

export const createFrameBatcher: FrameBatcherImplementation = (clock, commit) => {
  let pending = ''
  let cancelFrame: Cancel | null = null

  function flush() {
    cancelFrame = null
    if (pending === '') return
    const batch = pending
    pending = ''
    commit(batch)
  }

  return {
    push(delta) {
      pending += delta
      cancelFrame ??= clock.frame(flush)
    },
    drain() {
      cancelFrame?.()
      flush()
    },
    cancel() {
      cancelFrame?.()
      cancelFrame = null
      pending = ''
    },
  }
}
