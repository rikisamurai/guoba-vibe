import { abortError, StaleProjectionError } from './errors'
import { createInlineProjector } from './inline-projector'
import { identityOf, ProjectionGuard, sameProjectionIdentity } from './projection-guard'
import type { ProjectionPort, ProjectionResult, ProjectionTask, Projector } from './types'

interface TransferSession {
  raw: string
  config: string
}

function sessionKey(task: ProjectionTask): string {
  return `${task.runId}\u0000${task.blockId}`
}

function configOf(task: ProjectionTask): string {
  return JSON.stringify(
    task.operation.kind === 'highlight'
      ? { kind: task.operation.kind, language: task.operation.language || 'text' }
      : task.operation,
  )
}

export function createWorkerProjector(options: {
  port: ProjectionPort
  fallbackFactory?: () => Projector
}): Projector {
  const { port } = options
  const createFallback = options.fallbackFactory ?? createInlineProjector
  const sessions = new Map<string, TransferSession>()
  const guard = new ProjectionGuard()
  let fallback: Projector | undefined
  let workerAvailable = true
  let warmup: Promise<void> | undefined

  function fallbackProjector(): Projector {
    fallback ??= createFallback()
    return fallback
  }

  async function projectFallback(
    task: ProjectionTask,
    signal?: AbortSignal,
  ): Promise<ProjectionResult> {
    const result = await fallbackProjector().project(task, signal)
    guard.assertCurrent(task)
    return { ...result, via: 'inline-failover', sourceMode: result.sourceMode }
  }

  async function project(task: ProjectionTask, signal?: AbortSignal): Promise<ProjectionResult> {
    if (signal?.aborted) throw abortError(signal.reason)
    guard.begin(task)
    if (!workerAvailable) return projectFallback(task, signal)
    const key = sessionKey(task)
    const config = configOf(task)
    const prior = sessions.get(key)
    const sourceMode =
      prior?.config === config && task.raw.startsWith(prior.raw) ? 'suffix' : 'full'
    const source = sourceMode === 'suffix' ? task.raw.slice(prior?.raw.length ?? 0) : task.raw
    sessions.set(key, { raw: task.raw, config })
    try {
      const reply = await port.request(
        {
          type: 'project',
          identity: identityOf(task),
          operation: task.operation,
          sessionKey: key,
          sourceMode,
          source,
        },
        signal,
      )
      guard.assertCurrent(task)
      if (reply.type !== 'projected' || !sameProjectionIdentity(reply.identity, task)) {
        throw new Error('Worker returned a mismatched projection identity')
      }
      return {
        identity: identityOf(task),
        value: reply.value,
        via: 'worker',
        sourceMode,
      }
    } catch (error) {
      if (error instanceof StaleProjectionError) throw error
      if (signal?.aborted) {
        const current = sessions.get(key)
        if (current?.raw === task.raw && current.config === config) sessions.delete(key)
        throw abortError(signal.reason)
      }
      guard.assertCurrent(task)
      workerAvailable = false
      sessions.clear()
      return projectFallback(task, signal)
    }
  }

  return {
    prewarm(signal) {
      if (signal?.aborted) return Promise.reject(abortError(signal.reason))
      warmup ??= (async () => {
        if (!workerAvailable) return fallbackProjector().prewarm(signal)
        try {
          const reply = await port.request({ type: 'prewarm' }, signal)
          if (reply.type !== 'ready') throw new Error('Worker prewarm returned an invalid reply')
        } catch {
          if (signal?.aborted) throw abortError(signal.reason)
          workerAvailable = false
          await fallbackProjector().prewarm(signal)
        }
      })()
      return warmup
    },
    project,
    dispose() {
      sessions.clear()
      guard.dispose()
      fallback?.dispose()
      port.dispose()
    },
  }
}
