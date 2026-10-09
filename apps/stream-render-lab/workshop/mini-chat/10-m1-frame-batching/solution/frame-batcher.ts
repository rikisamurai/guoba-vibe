import type { FrameBatcherFactory } from '../contract'

export const createFrameBatcher: FrameBatcherFactory = (clock, commit) => {
  let pending = ''
  let cancelFrame: (() => void) | null = null

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
