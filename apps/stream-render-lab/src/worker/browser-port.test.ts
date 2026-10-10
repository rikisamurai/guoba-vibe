/* oxlint-disable typescript/no-unsafe-type-assertion -- The fake dispatches each listener only for its registered event type. */
import { describe, expect, it } from 'vitest'

import {
  createBrowserProjectionPort,
  type WorkerWireMessage,
  type WorkerWireReply,
} from './browser-port'

class FakeWorker {
  private messageListeners: Array<(event: MessageEvent<WorkerWireReply>) => void> = []
  private errorListeners: Array<(event: ErrorEvent) => void> = []
  readonly messages: WorkerWireMessage[] = []
  terminated = false

  addEventListener(
    type: 'message' | 'error',
    listener: ((event: MessageEvent<WorkerWireReply>) => void) | ((event: ErrorEvent) => void),
  ): void {
    if (type === 'message') {
      this.messageListeners.push(listener as (event: MessageEvent<WorkerWireReply>) => void)
    } else {
      this.errorListeners.push(listener as (event: ErrorEvent) => void)
    }
  }

  removeEventListener(
    type: 'message' | 'error',
    listener: ((event: MessageEvent<WorkerWireReply>) => void) | ((event: ErrorEvent) => void),
  ): void {
    if (type === 'message') {
      this.messageListeners = this.messageListeners.filter((item) => item !== listener)
    } else {
      this.errorListeners = this.errorListeners.filter((item) => item !== listener)
    }
  }

  postMessage(message: WorkerWireMessage): void {
    this.messages.push(message)
  }

  terminate(): void {
    this.terminated = true
  }

  reply(message: WorkerWireReply): void {
    const event = new MessageEvent<WorkerWireReply>('message', { data: message })
    this.messageListeners.forEach((listener) => listener(event))
  }
}

describe('BrowserProjectionPort', () => {
  it('correlates a Worker reply with its request', async () => {
    const worker = new FakeWorker()
    const port = createBrowserProjectionPort(worker)
    const result = port.request({ type: 'prewarm' })
    const sent = worker.messages[0]
    if (!sent || sent.type !== 'request') throw new Error('Expected Worker request')
    worker.reply({ requestId: sent.requestId, type: 'success', reply: { type: 'ready' } })

    await expect(result).resolves.toEqual({ type: 'ready' })
  })

  it('propagates caller abort to the Worker and rejects locally', async () => {
    const worker = new FakeWorker()
    const port = createBrowserProjectionPort(worker)
    const controller = new AbortController()
    const result = port.request({ type: 'prewarm' }, controller.signal)
    const sent = worker.messages[0]
    if (!sent || sent.type !== 'request') throw new Error('Expected Worker request')
    controller.abort('superseded')

    await expect(result).rejects.toMatchObject({ name: 'AbortError' })
    expect(worker.messages[1]).toEqual({ type: 'abort', requestId: sent.requestId })
  })

  it('terminates the Worker and rejects pending requests on dispose', async () => {
    const worker = new FakeWorker()
    const port = createBrowserProjectionPort(worker)
    const result = port.request({ type: 'prewarm' })
    port.dispose()

    await expect(result).rejects.toMatchObject({ name: 'ProjectionDisposedError' })
    expect(worker.terminated).toBe(true)
  })
})
