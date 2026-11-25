import type { HighlightResult } from '../heavy/incremental-highlighter'
import { createShikiStream } from '../heavy/shiki-stream'
import type { HighlightToken } from '../heavy/types'
import { parsePreview } from '../markdown'
import type { RenderDocument } from '../markdown/types'
import { abortError } from './errors'
import { identityOf, ProjectionGuard } from './projection-guard'
import type { ProjectionResult, ProjectionTask, Projector } from './types'

export interface InlineHighlighter {
  update(raw: string): Promise<readonly HighlightToken[]>
  finish(): Promise<readonly HighlightToken[]>
}

export type InlineHighlighterFactory = (language?: string | null) => Promise<InlineHighlighter>

interface InlineSession {
  raw: string
  config: string
  document?: RenderDocument
  highlighter?: Promise<InlineHighlighter>
}

function tokensOf<T extends { content: string; color?: string }>(
  result: HighlightResult<T>,
): HighlightToken[] {
  return [...result.stable, ...result.unstable].map(({ content, color }) =>
    color ? { content, color } : { content },
  )
}

async function defaultHighlighterFactory(language?: string | null): Promise<InlineHighlighter> {
  const highlighter = await createShikiStream(language)
  return {
    update: async (raw) => tokensOf(await highlighter.update(raw)),
    finish: async () => tokensOf(await highlighter.finish()),
  }
}

function sessionKey(task: ProjectionTask): string {
  return `${task.runId}\u0000${task.blockId}`
}

function configOf(task: ProjectionTask): string {
  return task.operation.kind === 'markdown'
    ? `markdown:${task.operation.mode}`
    : `highlight:${task.operation.language || 'text'}`
}

export function createInlineProjector(
  options: {
    highlighterFactory?: InlineHighlighterFactory
  } = {},
): Projector {
  const createHighlighter = options.highlighterFactory ?? defaultHighlighterFactory
  const sessions = new Map<string, InlineSession>()
  const guard = new ProjectionGuard()
  let warmup: Promise<void> | undefined

  async function project(task: ProjectionTask, signal?: AbortSignal): Promise<ProjectionResult> {
    if (signal?.aborted) throw abortError(signal.reason)
    guard.begin(task)
    const key = sessionKey(task)
    const config = configOf(task)
    const prior = sessions.get(key)
    const session = prior?.config === config ? prior : { raw: '', config }
    const sourceMode =
      task.raw.startsWith(session.raw) && session.raw.length > 0 ? 'suffix' : 'full'
    let value: ProjectionResult['value']
    if (task.operation.kind === 'markdown') {
      const document = parsePreview(task.raw, {
        mode: task.operation.mode,
        previous: sourceMode === 'suffix' ? session.document : undefined,
      })
      session.document = document
      value = { kind: 'markdown', document }
    } else {
      session.highlighter ??= createHighlighter(task.operation.language)
      const highlighter = await session.highlighter
      let tokens = await highlighter.update(task.raw)
      if (task.operation.final) tokens = await highlighter.finish()
      value = { kind: 'highlight', tokens }
    }
    if (signal?.aborted) throw abortError(signal.reason)
    guard.assertCurrent(task)
    session.raw = task.raw
    if (task.operation.kind === 'highlight' && task.operation.final) sessions.delete(key)
    else sessions.set(key, session)
    return { identity: identityOf(task), value, via: 'inline', sourceMode }
  }

  return {
    prewarm(signal) {
      if (signal?.aborted) return Promise.reject(abortError(signal.reason))
      warmup ??= createHighlighter('text').then(() => undefined)
      return warmup
    },
    project,
    dispose() {
      sessions.clear()
      guard.dispose()
    },
  }
}
