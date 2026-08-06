import { describe, expect, it, vi } from 'vitest'

import { IncrementalHighlighter, type HighlightTokenizer } from './incremental-highlighter'
import { createShikiStream } from './shiki-stream'

describe('IncrementalHighlighter', () => {
  it('enqueues only appended source and rebuilds after a non-append edit', async () => {
    const enqueue = vi.fn(async (chunk: string) => ({ stable: [chunk], unstable: [] }))
    const clear = vi.fn()
    const tokenizer: HighlightTokenizer<string> = { enqueue, clear, close: () => [] }
    const highlighter = new IncrementalHighlighter(tokenizer)

    await highlighter.update('const')
    await highlighter.update('const value')
    await highlighter.update('let')

    expect(enqueue.mock.calls.map(([chunk]) => chunk)).toEqual(['const', ' value', 'let'])
    expect(clear).toHaveBeenCalledOnce()
    expect(highlighter.enqueuedCodeUnits).toBe(14)
  })

  it('serializes async suffix jobs so tokenizer state cannot race', async () => {
    const resolvers: Array<(value: { stable: string[]; unstable: string[] }) => void> = []
    const tokenizer: HighlightTokenizer<string> = {
      enqueue: () => new Promise((resolve) => resolvers.push(resolve)),
      clear() {},
      close: () => [],
    }
    const highlighter = new IncrementalHighlighter(tokenizer)
    const first = highlighter.update('a')
    const second = highlighter.update('ab')
    await Promise.resolve()
    expect(resolvers).toHaveLength(1)
    resolvers[0]?.({ stable: ['old'], unstable: [] })
    await first
    await Promise.resolve()
    expect(resolvers).toHaveLength(2)
    resolvers[1]?.({ stable: ['new'], unstable: [] })
    await second
    expect(highlighter.tokens).toEqual({ stable: ['old', 'new'], unstable: [] })
  })

  it('serializes same-source updates and finalization behind pending enqueue work', async () => {
    let resolveEnqueue!: (value: { stable: string[]; unstable: string[] }) => void
    const calls: string[] = []
    const tokenizer: HighlightTokenizer<string> = {
      enqueue: (chunk) =>
        new Promise((resolve) => {
          calls.push(`enqueue:${chunk}`)
          resolveEnqueue = resolve
        }),
      clear() {},
      close: () => {
        calls.push('close')
        return ['tail']
      },
    }
    const highlighter = new IncrementalHighlighter(tokenizer)
    const first = highlighter.update('const x = 1')
    const sameSource = highlighter.update('const x = 1')
    const finalized = highlighter.finish()

    await Promise.resolve()
    expect(calls).toEqual(['enqueue:const x = 1'])
    resolveEnqueue({ stable: ['body'], unstable: [] })
    await Promise.all([first, sameSource, finalized])
    expect(calls).toEqual(['enqueue:const x = 1', 'close'])
  })

  it('uses the real Shiki stream tokenizer without re-enqueueing the prefix', async () => {
    const highlighter = await createShikiStream('typescript')
    await highlighter.update('const value')
    await highlighter.update('const value = 42\n')
    const result = await highlighter.finish()

    expect(highlighter.enqueuedCodeUnits).toBe('const value = 42\n'.length)
    expect(result.stable.map((token) => token.content).join('')).toBe('const value = 42\n')
  })
})
