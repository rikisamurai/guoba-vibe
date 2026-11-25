import { describe, expect, it, vi } from 'vitest'

import { parsePreview } from '../markdown'
import {
  createInlineProjector,
  createWorkerProjector,
  StaleProjectionError,
  type InlineHighlighter,
  type ProjectionPort,
  type WorkerProjectionCommand,
  type WorkerProjectionReply,
} from './index'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((done, fail) => {
    resolve = done
    reject = fail
  })
  return { promise, resolve, reject }
}

const markdownReply = (
  command: Extract<WorkerProjectionCommand, { type: 'project' }>,
  raw: string,
): WorkerProjectionReply => ({
  type: 'projected',
  identity: command.identity,
  value: {
    kind: 'markdown',
    document: parsePreview(raw, { mode: 'M2' }),
  },
})

describe('projection stale guards', () => {
  it('InlineProjector drops an older asynchronous highlight result', async () => {
    const jobs = new Map<string, ReturnType<typeof deferred<readonly { content: string }[]>>>()
    const highlighter: InlineHighlighter = {
      update(raw) {
        const job = deferred<readonly { content: string }[]>()
        jobs.set(raw, job)
        return job.promise
      },
      finish: async () => [],
    }
    const projector = createInlineProjector({ highlighterFactory: async () => highlighter })
    const first = projector.project({
      runId: 'run',
      blockId: 'code',
      revision: 1,
      raw: 'a',
      operation: { kind: 'highlight' },
    })
    const second = projector.project({
      runId: 'run',
      blockId: 'code',
      revision: 2,
      raw: 'ab',
      operation: { kind: 'highlight' },
    })

    await vi.waitFor(() => expect(jobs.size).toBe(2))
    jobs.get('a')?.resolve([{ content: 'a' }])
    await expect(first).rejects.toBeInstanceOf(StaleProjectionError)
    jobs.get('ab')?.resolve([{ content: 'ab' }])
    await expect(second).resolves.toMatchObject({ identity: { revision: 2 } })
  })

  it('WorkerProjector drops an out-of-order older response', async () => {
    const pending: Array<{
      command: Extract<WorkerProjectionCommand, { type: 'project' }>
      job: ReturnType<typeof deferred<WorkerProjectionReply>>
    }> = []
    const port: ProjectionPort = {
      request: async (command) => {
        if (command.type === 'prewarm') return { type: 'ready' }
        const job = deferred<WorkerProjectionReply>()
        pending.push({ command, job })
        return job.promise
      },
      dispose() {},
    }
    const projector = createWorkerProjector({ port })
    const first = projector.project({
      runId: 'run',
      blockId: 'answer',
      revision: 1,
      raw: 'a',
      operation: { kind: 'markdown', mode: 'M2' },
    })
    const second = projector.project({
      runId: 'run',
      blockId: 'answer',
      revision: 2,
      raw: 'ab',
      operation: { kind: 'markdown', mode: 'M2' },
    })

    const latest = pending[1]
    if (!latest) throw new Error('Expected latest Worker request')
    latest.job.resolve(markdownReply(latest.command, 'ab'))
    await expect(second).resolves.toMatchObject({ identity: { revision: 2 } })
    const older = pending[0]
    if (!older) throw new Error('Expected older Worker request')
    older.job.resolve(markdownReply(older.command, 'a'))
    await expect(first).rejects.toBeInstanceOf(StaleProjectionError)
  })
})

describe.each([
  ['failure', new Error('worker crashed')],
  ['worker abort', new DOMException('worker aborted', 'AbortError')],
])('WorkerProjector %s failover', (_case, workerError) => {
  it('rebuilds from retained raw in a fresh InlineProjector', async () => {
    let requests = 0
    const port: ProjectionPort = {
      async request(command) {
        if (command.type === 'prewarm') return { type: 'ready' }
        requests += 1
        if (requests === 2) throw workerError
        return markdownReply(command, command.source)
      },
      dispose() {},
    }
    const projector = createWorkerProjector({ port })
    await projector.project({
      runId: 'run',
      blockId: 'answer',
      revision: 1,
      raw: 'prefix',
      operation: { kind: 'markdown', mode: 'M2' },
    })
    const recovered = await projector.project({
      runId: 'run',
      blockId: 'answer',
      revision: 2,
      raw: 'prefix tail',
      operation: { kind: 'markdown', mode: 'M2' },
    })

    expect(recovered).toMatchObject({ via: 'inline-failover', sourceMode: 'full' })
    if (recovered.value.kind === 'markdown') {
      expect(recovered.value.document.raw).toBe('prefix tail')
    }
    const continued = await projector.project({
      runId: 'run',
      blockId: 'answer',
      revision: 3,
      raw: 'prefix tail next',
      operation: { kind: 'markdown', mode: 'M2' },
    })
    expect(continued).toMatchObject({ via: 'inline-failover', sourceMode: 'suffix' })
  })
})

it('rebuilds highlighting from full raw after a suffix request fails', async () => {
  let requests = 0
  const port: ProjectionPort = {
    async request(command) {
      if (command.type === 'prewarm') return { type: 'ready' }
      requests += 1
      if (requests === 2) throw new Error('worker lost its tokenizer')
      return {
        type: 'projected',
        identity: command.identity,
        value: { kind: 'highlight', tokens: [{ content: command.source }] },
      }
    },
    dispose() {},
  }
  const projector = createWorkerProjector({ port })
  await projector.project({
    runId: 'run',
    blockId: 'code',
    revision: 1,
    raw: 'const',
    operation: { kind: 'highlight', language: 'typescript' },
  })
  const recovered = await projector.project({
    runId: 'run',
    blockId: 'code',
    revision: 2,
    raw: 'const value = 42\n',
    operation: { kind: 'highlight', language: 'typescript', final: true },
  })

  expect(recovered).toMatchObject({ via: 'inline-failover', sourceMode: 'full' })
  if (recovered.value.kind === 'highlight') {
    expect(recovered.value.tokens.map((token) => token.content).join('')).toBe('const value = 42\n')
  }
})

it('does not turn caller cancellation into failover work', async () => {
  const fallbackFactory = vi.fn(createInlineProjector)
  const commands: Array<Extract<WorkerProjectionCommand, { type: 'project' }>> = []
  const port: ProjectionPort = {
    request: (command, signal) => {
      if (command.type === 'prewarm') return Promise.resolve({ type: 'ready' })
      commands.push(command)
      if (!signal) return Promise.resolve(markdownReply(command, command.source))
      return new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
      })
    },
    dispose() {},
  }
  const projector = createWorkerProjector({ port, fallbackFactory })
  const controller = new AbortController()
  const pending = projector.project(
    {
      runId: 'run',
      blockId: 'answer',
      revision: 1,
      raw: 'raw',
      operation: { kind: 'markdown', mode: 'M2' },
    },
    controller.signal,
  )
  controller.abort('user stopped')

  await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
  expect(fallbackFactory).not.toHaveBeenCalled()
  await projector.project({
    runId: 'run',
    blockId: 'answer',
    revision: 2,
    raw: 'raw next',
    operation: { kind: 'markdown', mode: 'M2' },
  })
  expect(commands[1]).toMatchObject({ sourceMode: 'full', source: 'raw next' })
})
