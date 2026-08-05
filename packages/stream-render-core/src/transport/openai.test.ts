import { describe, expect, it } from 'vitest'

import { chatDeltas } from './openai'
import type { ChatDelta } from './openai'

function sseStream(...events: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      for (const e of events) controller.enqueue(encoder.encode(`data: ${e}\n\n`))
      controller.close()
    },
  })
}

const chunk = (delta: Record<string, string>) => JSON.stringify({ choices: [{ delta }] })

async function collect(body: ReadableStream<Uint8Array>): Promise<ChatDelta[]> {
  const out: ChatDelta[] = []
  for await (const d of chatDeltas(body)) out.push(d)
  return out
}

describe('chatDeltas', () => {
  it('产出 content 增量并在 [DONE] 处终止', async () => {
    const deltas = await collect(
      sseStream(
        chunk({ content: '你' }),
        chunk({ content: '好' }),
        '[DONE]',
        chunk({ content: '不应出现' }),
      ),
    )
    expect(deltas).toEqual([{ content: '你' }, { content: '好' }])
  })

  it('区分 reasoning_content 与 content（kimi-k2.5 行为）', async () => {
    const deltas = await collect(
      sseStream(chunk({ reasoning_content: '思考中' }), chunk({ content: '答案' })),
    )
    expect(deltas).toEqual([{ reasoning: '思考中' }, { content: '答案' }])
  })

  it('跳过畸形 JSON 而不中断整个流', async () => {
    const deltas = await collect(sseStream('{broken', chunk({ content: 'ok' })))
    expect(deltas).toEqual([{ content: 'ok' }])
  })

  it('过滤空增量（如首个只有 role 的 chunk）', async () => {
    const deltas = await collect(
      sseStream(JSON.stringify({ choices: [{ delta: { role: 'assistant', content: '' } }] })),
    )
    expect(deltas).toEqual([])
  })
})
