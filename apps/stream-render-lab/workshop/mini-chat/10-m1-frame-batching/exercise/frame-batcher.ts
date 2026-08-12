import type { FrameBatcherFactory } from '../contract'

export const createFrameBatcher: FrameBatcherFactory = (_clock, commit) => ({
  // TODO 10: 合并同一显示帧的 delta，并正确处理 drain 与 cancel。
  push(delta) {
    commit(delta)
  },
  drain() {},
  cancel() {},
})
