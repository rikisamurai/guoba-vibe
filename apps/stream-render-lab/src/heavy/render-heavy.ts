import type { ThemedToken } from 'shiki'

import type { HighlightResult, IncrementalHighlighter } from './incremental-highlighter'
import { createShikiStream } from './shiki-stream'
import type { HeavyJobSpec, HeavyOutput, HighlightToken } from './types'

export interface CodeSession {
  language: string
  highlighter: Promise<IncrementalHighlighter<ThemedToken>>
}

function tokensOf(result: HighlightResult<ThemedToken>): HighlightToken[] {
  return [...result.stable, ...result.unstable].map(({ content, color }) => {
    const token: HighlightToken = { content }
    if (color) token.color = color
    return token
  })
}

export async function renderCode(
  job: HeavyJobSpec,
  sessions: Map<string, CodeSession>,
  signal: AbortSignal,
): Promise<HeavyOutput> {
  const language = job.language || 'text'
  let session = sessions.get(job.key)
  if (!session || session.language !== language) {
    session = { language, highlighter: createShikiStream(language) }
    sessions.set(job.key, session)
  }
  const highlighter = await session.highlighter
  const result = await highlighter.update(job.source)
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
  return { kind: 'code', tokens: tokensOf(result) }
}

export async function finishCode(
  job: HeavyJobSpec,
  sessions: Map<string, CodeSession>,
): Promise<HeavyOutput | null> {
  const session = sessions.get(job.key)
  if (!session) return null
  const highlighter = await session.highlighter
  return { kind: 'code', tokens: tokensOf(await highlighter.finish()) }
}

export async function renderMath(job: HeavyJobSpec): Promise<HeavyOutput> {
  const [{ default: katex }, { default: DOMPurify }] = await Promise.all([
    import('katex'),
    import('dompurify'),
  ])
  const html = katex.renderToString(job.source, {
    displayMode: job.display ?? true,
    throwOnError: false,
    trust: false,
  })
  return { kind: 'html', html: DOMPurify.sanitize(html) }
}

export async function renderMermaid(job: HeavyJobSpec, signal: AbortSignal): Promise<HeavyOutput> {
  const [{ default: mermaid }, { default: DOMPurify }] = await Promise.all([
    import('mermaid'),
    import('dompurify'),
  ])
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
  mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'neutral' })
  const id = `mermaid-${job.runId}-${job.blockId}-${job.revision}`.replace(/[^\w-]/g, '-')
  const { svg } = await mermaid.render(id, job.source)
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
  const html = DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true } })
  return { kind: 'html', html }
}
