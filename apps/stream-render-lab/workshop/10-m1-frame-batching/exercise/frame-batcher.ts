import type { FrameBatcherImplementation } from '../contract'

export const createFrameBatcher: FrameBatcherImplementation = (_clock, commit) => ({
  // TODO: 同一 frame 的 delta 只安排一次提交，并让 drain 取消 pending frame。
  push: commit,
  drain() {},
  cancel() {},
})
