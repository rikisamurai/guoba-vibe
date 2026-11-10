import { describe, expect, it, vi } from 'vitest'

import { deferred } from '../engine/deferred'
import { finishCode, renderCode, type CodeSession } from './render-heavy'
import type { HeavyJobSpec } from './types'

const { beforeLoad } = vi.hoisted(() => ({ beforeLoad: vi.fn<() => void | Promise<void>>() }))

vi.mock('@shikijs/core', async (importOriginal) => {
  const original = await importOriginal<typeof import('@shikijs/core')>()
  return {
    ...original,
    async createHighlighterCore(...args: Parameters<typeof original.createHighlighterCore>) {
      const highlighter = await original.createHighlighterCore(...args)
      const loadLanguage = highlighter.loadLanguage.bind(highlighter)
      vi.spyOn(highlighter, 'loadLanguage').mockImplementation(async (...languages) => {
        await beforeLoad()
        await loadLanguage(...languages)
      })
      return highlighter
    },
  }
})

function job(language: string, source: string): HeavyJobSpec {
  return {
    key: 'code',
    kind: 'code',
    runId: 'run',
    blockId: 'block',
    revision: 1,
    language,
    source,
  }
}

describe('Shiki code blocks', () => {
  it('retries language loading for the same block and produces the original source exactly once', async () => {
    const failure = new Error('temporary language load failure')
    beforeLoad.mockRejectedValueOnce(failure)
    const sessions = new Map<string, CodeSession>()
    const signal = new AbortController().signal
    const source = 'const value: number = 42\n'
    const block = job('typescript', source)

    await expect(renderCode(block, sessions, signal)).rejects.toBe(failure)
    await renderCode({ ...block, revision: 2 }, sessions, signal)
    const result = await finishCode(block, sessions)
    expect(result?.kind === 'code' && result.tokens.map((token) => token.content).join('')).toBe(
      source,
    )
  })

  it('retains the replacement session when an older language load fails', async () => {
    const pending = deferred<Error>()
    const started = deferred<void>()
    beforeLoad.mockImplementationOnce(async () => {
      started.resolve(undefined)
      throw await pending.promise
    })
    const sessions = new Map<string, CodeSession>()
    const signal = new AbortController().signal
    const failure = new Error('outdated language load failure')
    const old = renderCode(job('javascript', 'const stale = 1'), sessions, signal)
    const observedFailure = expect(old).rejects.toBe(failure)
    await started.promise
    await renderCode(job('json', '{"current":true}'), sessions, signal)
    const current = sessions.get('code')
    pending.resolve(failure)
    await observedFailure
    expect(sessions.get('code')).toBe(current)
    expect(current?.language).toBe('json')
  })
})
