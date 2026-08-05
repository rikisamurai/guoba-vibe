export interface DeltaBatcher<T> {
  push(item: T): void
  /** 立刻提交队列中的全部增量（流结束/取消时调用） */
  flush(): void
}

/**
 * P0 的「合并提交」：网络增量先进队列，按固定节拍批量交给 UI。
 * 这是文档基线第 2 条的最小实现——每个网络 chunk 都触发一次 React
 * 提交是明确反模式，32~80ms 的合并窗口人眼无感却能砍掉大部分提交。
 */
export function createDeltaBatcher<T>(
  onFlush: (batch: T[]) => void,
  intervalMs = 48,
): DeltaBatcher<T> {
  let queue: T[] = []
  let timer: ReturnType<typeof setTimeout> | null = null

  const commit = () => {
    timer = null
    if (queue.length === 0) return
    const batch = queue
    queue = []
    onFlush(batch)
  }

  return {
    push(item) {
      queue.push(item)
      timer ??= setTimeout(commit, intervalMs)
    },
    flush() {
      if (timer !== null) clearTimeout(timer)
      commit()
    },
  }
}
