import { describe, expect, it } from 'vitest'

import { adaptProtocolStream } from '../protocol/protocol-stream'
import { LAB_PRESETS, presetConfig } from './presets'
import { buildWireChunks, type WireChunk } from './wire'

describe('Lab wire generator', () => {
  it('replays the same seed with identical byte boundaries and delays', () => {
    const config = presetConfig('quick-start-burst')
    const first = buildWireChunks(config).map(observation)
    const second = buildWireChunks(config).map(observation)

    expect(second).toEqual(first)
  })

  it('makes chunk controls alter the generated transport', () => {
    const config = presetConfig('quick-start-burst')
    const everyByte = buildWireChunks({ ...config, chunkMin: 1, chunkMax: 1 })
    const largeChunks = buildWireChunks({ ...config, chunkMin: 64, chunkMax: 64 })

    expect(everyByte.length).toBeGreaterThan(largeChunks.length)
    expect(concatenate(everyByte)).toEqual(concatenate(largeChunks))
  })

  it('keeps every default teaching replay below a short deterministic budget', () => {
    for (const { id } of LAB_PRESETS) {
      const chunks = buildWireChunks(presetConfig(id))
      const totalDelay = chunks.reduce((sum, chunk) => sum + chunk.delayMs, 0)
      expect(chunks.length, `${id} chunk count`).toBeLessThan(1_000)
      expect(totalDelay, `${id} total delay`).toBeLessThan(5_000)
    }
  })

  it('feeds the SSE edge-case bytes through decode, parser and provider adapter', async () => {
    const config = {
      ...presetConfig('sse-edge-cases'),
      input: 'UTF-8 🙂 survives arbitrary byte cuts.',
      chunkMin: 1,
      chunkMax: 1,
    }
    const normalized = []

    for await (const event of adaptProtocolStream(
      'chat-completions',
      bytes(buildWireChunks(config)),
    )) {
      normalized.push(event.event)
    }

    const text = normalized
      .filter((event) => event.type === 'part.delta' && event.delta.kind === 'text')
      .map((event) =>
        event.type === 'part.delta' && event.delta.kind === 'text' ? event.delta.text : '',
      )
      .join('')
    expect(text).toBe(config.input)
    expect(normalized.at(-1)).toMatchObject({
      type: 'response.end',
      outcome: { kind: 'completed' },
    })
  })
})

function observation(chunk: WireChunk) {
  return { bytes: [...chunk.bytes], delayMs: chunk.delayMs }
}

function concatenate(chunks: readonly WireChunk[]): Uint8Array {
  const output = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0))
  let offset = 0
  for (const chunk of chunks) {
    output.set(chunk.bytes, offset)
    offset += chunk.byteLength
  }
  return output
}

async function* bytes(chunks: readonly WireChunk[]): AsyncGenerator<Uint8Array> {
  for (const chunk of chunks) yield chunk.bytes
}
