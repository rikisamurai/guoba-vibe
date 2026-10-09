/* oxlint-disable typescript/no-unsafe-type-assertion -- This module runs only in a Dedicated Worker global. */
/* oxlint-disable unicorn/require-post-message-target-origin -- Dedicated Worker postMessage has no targetOrigin. */
import { type WorkerWireMessage, type WorkerWireReply } from './browser-port'
import { createWorkerRuntime } from './worker-runtime'

interface WorkerScope {
  addEventListener(
    type: 'message',
    listener: (event: MessageEvent<WorkerWireMessage>) => void,
  ): void
  postMessage(message: WorkerWireReply): void
}

function serializedError(error: unknown): { name: string; message: string } {
  if (error instanceof Error) return { name: error.name, message: error.message }
  return { name: 'Error', message: String(error) }
}

const scope = globalThis as unknown as WorkerScope
const runtime = createWorkerRuntime()
const controllers = new Map<number, AbortController>()

scope.addEventListener('message', ({ data }) => {
  if (data.type === 'abort') {
    controllers.get(data.requestId)?.abort('Host aborted projection')
    return
  }
  const controller = new AbortController()
  controllers.set(data.requestId, controller)
  void runtime
    .handle(data.command, controller.signal)
    .then(
      (reply) => {
        if (!controller.signal.aborted) {
          scope.postMessage({ requestId: data.requestId, type: 'success', reply })
        }
      },
      (error) => {
        if (!controller.signal.aborted) {
          scope.postMessage({
            requestId: data.requestId,
            type: 'failure',
            error: serializedError(error),
          })
        }
      },
    )
    .finally(() => controllers.delete(data.requestId))
})
