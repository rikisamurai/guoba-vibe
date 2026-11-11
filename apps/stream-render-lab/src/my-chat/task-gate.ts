import type { TaskGate } from '../practice/types'

// C5: A slow old task may finish last. Only the latest, still-wanted result may commit.
export function createTaskGate<T>(
  render: (source: string) => Promise<T>,
  commit: (output: T) => void,
): TaskGate {
  return {
    push(source) {
      void render(source).then(commit)
    },
    dispose() {},
  }
}
