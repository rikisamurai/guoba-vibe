import { describe, expect, it } from 'vitest'

import {
  createInlineProjector,
  createWorkerProjector,
  createWorkerRuntime,
  type ProjectionPort,
  type WorkerProjectionCommand,
  type WorkerProjectionReply,
} from './index'

class LoopbackPort implements ProjectionPort {
  readonly commands: WorkerProjectionCommand[] = []

  constructor(
    private readonly handle: (
      command: WorkerProjectionCommand,
      signal?: AbortSignal,
    ) => Promise<WorkerProjectionReply>,
  ) {}

  request(command: WorkerProjectionCommand, signal?: AbortSignal) {
    this.commands.push(command)
    return this.handle(command, signal)
  }

  dispose() {}
}

function projectorFactories() {
  return [
    ['InlineProjector', () => createInlineProjector()],
    [
      'WorkerProjector',
      () => {
        const runtime = createWorkerRuntime()
        return createWorkerProjector({
          port: new LoopbackPort((command, signal) => runtime.handle(command, signal)),
        })
      },
    ],
  ] as const
}

describe.each(projectorFactories())('%s contract', (_name, createProjector) => {
  it('projects Markdown from canonical raw', async () => {
    const projector = createProjector()
    await projector.prewarm()
    await projector.prewarm()

    const result = await projector.project({
      runId: 'run-1',
      blockId: 'answer',
      revision: 1,
      raw: '# Hello\n\n**stream',
      operation: { kind: 'markdown', mode: 'M3' },
    })

    expect(result.identity).toEqual({ runId: 'run-1', blockId: 'answer', revision: 1 })
    expect(result.value.kind).toBe('markdown')
    if (result.value.kind === 'markdown') {
      expect(result.value.document.raw).toBe('# Hello\n\n**stream')
      expect(result.value.document.visible).toBe('# Hello\n\n**stream**')
    }
    projector.dispose()
  })

  it('projects appended highlighting without losing source', async () => {
    const projector = createProjector()
    const first = await projector.project({
      runId: 'run-2',
      blockId: 'code',
      revision: 1,
      raw: 'const value',
      operation: { kind: 'highlight', language: 'typescript' },
    })
    const second = await projector.project({
      runId: 'run-2',
      blockId: 'code',
      revision: 2,
      raw: 'const value = 42\n',
      operation: { kind: 'highlight', language: 'typescript', final: true },
    })

    expect(first.value.kind).toBe('highlight')
    expect(second.value.kind).toBe('highlight')
    if (second.value.kind === 'highlight') {
      expect(second.value.tokens.map((token) => token.content).join('')).toBe('const value = 42\n')
    }
    projector.dispose()
  })
})

describe('WorkerProjector transport', () => {
  it('prewarms once and transfers only the appended session suffix', async () => {
    const runtime = createWorkerRuntime()
    const port = new LoopbackPort((command, signal) => runtime.handle(command, signal))
    const projector = createWorkerProjector({ port })

    await Promise.all([projector.prewarm(), projector.prewarm()])
    await projector.project({
      runId: 'run-3',
      blockId: 'answer',
      revision: 1,
      raw: 'hello',
      operation: { kind: 'markdown', mode: 'M2' },
    })
    await projector.project({
      runId: 'run-3',
      blockId: 'answer',
      revision: 2,
      raw: 'hello world',
      operation: { kind: 'markdown', mode: 'M2' },
    })

    expect(port.commands.filter((command) => command.type === 'prewarm')).toHaveLength(1)
    const projectCommands = port.commands.filter((command) => command.type === 'project')
    expect(projectCommands.map(({ sourceMode, source }) => [sourceMode, source])).toEqual([
      ['full', 'hello'],
      ['suffix', ' world'],
    ])
  })
})
