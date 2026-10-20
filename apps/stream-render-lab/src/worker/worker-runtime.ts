import { abortError } from './errors'
import { createInlineProjector } from './inline-projector'
import type { Projector, WorkerProjectionCommand, WorkerProjectionReply } from './types'

export interface WorkerProjectionRuntime {
  handle(command: WorkerProjectionCommand, signal?: AbortSignal): Promise<WorkerProjectionReply>
  dispose(): void
}

export function createWorkerRuntime(
  options: {
    projector?: Projector
  } = {},
): WorkerProjectionRuntime {
  const projector = options.projector ?? createInlineProjector()
  const sources = new Map<string, string>()
  let queue: Promise<void> = Promise.resolve()

  async function run(
    command: WorkerProjectionCommand,
    signal?: AbortSignal,
  ): Promise<WorkerProjectionReply> {
    if (signal?.aborted) throw abortError(signal.reason)
    if (command.type === 'prewarm') {
      await projector.prewarm(signal)
      return { type: 'ready' }
    }
    const prior = sources.get(command.sessionKey)
    if (command.sourceMode === 'suffix' && prior === undefined) {
      throw new Error(`Missing Worker projection session: ${command.sessionKey}`)
    }
    const raw = command.sourceMode === 'suffix' ? `${prior}${command.source}` : command.source
    const result = await projector.project(
      {
        ...command.identity,
        raw,
        operation: command.operation,
      },
      signal,
    )
    if (signal?.aborted) throw abortError(signal.reason)
    sources.set(command.sessionKey, raw)
    return { type: 'projected', identity: result.identity, value: result.value }
  }

  return {
    handle(command, signal) {
      const pending = queue.then(() => run(command, signal))
      queue = pending.then(
        () => undefined,
        () => undefined,
      )
      return pending
    },
    dispose() {
      sources.clear()
      projector.dispose()
    },
  }
}
