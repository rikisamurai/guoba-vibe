/* oxlint-disable unicorn/require-post-message-target-origin -- Dedicated Worker postMessage has no targetOrigin. */
import { abortError, ProjectionDisposedError } from './errors'
import type { ProjectionPort, WorkerProjectionCommand, WorkerProjectionReply } from './types'

export type WorkerWireMessage =
  | { type: 'request'; requestId: number; command: WorkerProjectionCommand }
  | { type: 'abort'; requestId: number }

export type WorkerWireReply =
  | { requestId: number; type: 'success'; reply: WorkerProjectionReply }
  | {
      requestId: number
      type: 'failure'
      error: { name: string; message: string }
    }

export interface BrowserWorkerLike {
  addEventListener(type: 'message', listener: (event: MessageEvent<WorkerWireReply>) => void): void
  addEventListener(type: 'error', listener: (event: ErrorEvent) => void): void
  removeEventListener(
    type: 'message',
    listener: (event: MessageEvent<WorkerWireReply>) => void,
  ): void
  removeEventListener(type: 'error', listener: (event: ErrorEvent) => void): void
  postMessage(message: WorkerWireMessage): void
  terminate(): void
}

interface PendingRequest {
  resolve(reply: WorkerProjectionReply): void
  reject(error: unknown): void
  removeAbort(): void
}

function workerError(error: { name: string; message: string }): Error {
  const result =
    error.name === 'AbortError'
      ? new DOMException(error.message, 'AbortError')
      : new Error(error.message)
  if (!(result instanceof DOMException)) result.name = error.name
  return result
}

export function createBrowserProjectionPort(worker: BrowserWorkerLike): ProjectionPort {
  const pending = new Map<number, PendingRequest>()
  let nextRequestId = 0
  let disposed = false

  function settle(requestId: number): PendingRequest | undefined {
    const request = pending.get(requestId)
    if (!request) return undefined
    pending.delete(requestId)
    request.removeAbort()
    return request
  }

  const onMessage = ({ data }: MessageEvent<WorkerWireReply>) => {
    const request = settle(data.requestId)
    if (!request) return
    if (data.type === 'success') request.resolve(data.reply)
    else request.reject(workerError(data.error))
  }
  const onError = (event: ErrorEvent) => {
    const error = new Error(event.message || 'Projection Worker crashed')
    for (const requestId of pending.keys()) settle(requestId)?.reject(error)
  }
  worker.addEventListener('message', onMessage)
  worker.addEventListener('error', onError)

  return {
    request(command, signal) {
      if (disposed) return Promise.reject(new ProjectionDisposedError())
      if (signal?.aborted) return Promise.reject(abortError(signal.reason))
      const requestId = nextRequestId
      nextRequestId += 1
      return new Promise((resolve, reject) => {
        const onAbort = () => {
          const request = settle(requestId)
          if (!request) return
          worker.postMessage({ type: 'abort', requestId })
          request.reject(abortError(signal?.reason))
        }
        signal?.addEventListener('abort', onAbort, { once: true })
        pending.set(requestId, {
          resolve,
          reject,
          removeAbort: () => signal?.removeEventListener('abort', onAbort),
        })
        try {
          worker.postMessage({ type: 'request', requestId, command })
        } catch (error) {
          settle(requestId)?.reject(error)
        }
      })
    },
    dispose() {
      if (disposed) return
      disposed = true
      const error = new ProjectionDisposedError()
      for (const requestId of pending.keys()) settle(requestId)?.reject(error)
      worker.removeEventListener('message', onMessage)
      worker.removeEventListener('error', onError)
      worker.terminate()
    },
  }
}
