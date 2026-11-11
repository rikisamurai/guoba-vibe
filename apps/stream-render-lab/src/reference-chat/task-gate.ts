import type { TaskGate } from '../practice/types'

export function createTaskGate<T>(
  render: (source: string) => Promise<T>,
  commit: (output: T) => void,
): TaskGate {
  let revision = 0
  let latest: string | undefined
  return {
    push(source) {
      if (source === latest) return
      latest = source
      const mine = ++revision
      void render(source).then(
        (output) => {
          if (mine === revision) commit(output)
        },
        () => {},
      )
    },
    dispose() {
      revision += 1
    },
  }
}
