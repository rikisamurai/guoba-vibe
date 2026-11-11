import { afterEach, describe, expect, it, vi } from 'vitest'

import { GET } from './teaching'

afterEach(() => vi.useRealTimers())

async function collect(mode: string) {
  const response = GET(new Request(`http://local/api/teaching?mode=${mode}`))
  const reader = response.body!.getReader()
  const chunks: Uint8Array[] = []
  const consume = async () => {
    while (true) {
      // oxlint-disable-next-line no-await-in-loop -- observe the source writes in order
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
    }
  }
  const result = consume()
  await vi.runAllTimersAsync()
  await result
  return chunks
}

function decode(chunks: Uint8Array[]) {
  const decoder = new TextDecoder()
  return chunks.map((chunk) => decoder.decode(chunk, { stream: true })).join('') + decoder.decode()
}

describe('teaching HTTP source', () => {
  it('cuts server writes inside UTF-8 while preserving the full wire response', async () => {
    vi.useFakeTimers()
    const streamed = await collect('stream')
    const split = await collect('split')
    const buffered = await collect('buffered')
    expect(decode(split)).toBe(decode(streamed))
    expect(decode(buffered)).toBe(decode(streamed))
    expect(split.length).toBeGreaterThan(streamed.length)
    expect(buffered).toHaveLength(1)
    expect(split.some((bytes) => new TextDecoder().decode(bytes).includes('�'))).toBe(true)
  })

  it('truncates without the completion marker and rejects unknown scenarios', async () => {
    vi.useFakeTimers()
    const truncated = await collect('truncated')
    expect(decode(truncated)).toContain('你好')
    expect(decode(truncated)).not.toContain('[DONE]')
    expect(GET(new Request('http://local/api/teaching?mode=unknown')).status).toBe(400)
  })

  it('cancels scheduled server writes when a client stops reading', async () => {
    vi.useFakeTimers()
    const response = GET(new Request('http://local/api/teaching?mode=split'))
    const reader = response.body!.getReader()
    const pending = reader.read()
    await vi.advanceTimersByTimeAsync(160)
    expect((await pending).value).toBeDefined()
    await reader.cancel()
    expect(vi.getTimerCount()).toBe(0)
  })
})
