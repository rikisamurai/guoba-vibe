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

  it('groups the Quick Start replay into inspectable frame bursts', () => {
    const config = presetConfig('quick-start-burst')
    const chunks = buildWireChunks(config)
    const groups = burstGroups(chunks)
    const totalDelay = chunks.reduce((sum, chunk) => sum + chunk.delayMs, 0)
    const gaps = chunks.filter((chunk) => chunk.delayMs >= 300).map((chunk) => chunk.delayMs)

    expect(groups.map((group) => group.length).every((size) => size >= 4 && size <= 6)).toBe(true)
    expect(gaps.length).toBe(groups.length - 1)
    expect(gaps.every((delay) => delay >= 300 && delay <= 450)).toBe(true)
    expect(groups.flatMap((group) => group.slice(1)).every((chunk) => chunk.delayMs <= 4)).toBe(
      true,
    )
    expect(
      groups.every(
        (group) =>
          group.slice(1).reduce((sum, chunk) => sum + chunk.delayMs, 0) < config.commitCadenceMs,
      ),
    ).toBe(true)
    expect(totalDelay).toBeGreaterThanOrEqual(2_500)
    expect(totalDelay).toBeLessThanOrEqual(5_000)
  })

  it('uses burstiness to control how many Quick Start chunks share a burst', () => {
    const config = presetConfig('quick-start-burst')
    const defaultGroups = burstGroups(buildWireChunks(config))
    const lowerBurstinessGroups = burstGroups(buildWireChunks({ ...config, burstiness: 50 }))

    expect(defaultGroups.every((group) => group.length >= 4 && group.length <= 6)).toBe(true)
    expect(lowerBurstinessGroups.length).toBeGreaterThan(defaultGroups.length)
  })

  it('uses commit cadence as the Quick Start intra-burst delay budget', () => {
    const config = presetConfig('quick-start-burst')
    const defaultGroups = burstGroups(buildWireChunks(config))
    const tightGroups = burstGroups(buildWireChunks({ ...config, commitCadenceMs: 8 }))
    const defaultMicroDelays = defaultGroups.flatMap((group) => group.slice(1))
    const tightMicroDelays = tightGroups.flatMap((group) => group.slice(1))

    expect(tightMicroDelays.map((chunk) => chunk.delayMs)).not.toEqual(
      defaultMicroDelays.map((chunk) => chunk.delayMs),
    )
    expect(Math.max(...tightMicroDelays.map((chunk) => chunk.delayMs))).toBeLessThan(
      Math.max(...defaultMicroDelays.map((chunk) => chunk.delayMs)),
    )
    expect(
      tightGroups.every(
        (group) => group.slice(1).reduce((sum, chunk) => sum + chunk.delayMs, 0) < 8,
      ),
    ).toBe(true)
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

function burstGroups(chunks: readonly WireChunk[]): WireChunk[][] {
  const groups: WireChunk[][] = []
  for (const chunk of chunks) {
    if (groups.length === 0 || chunk.delayMs >= 300) groups.push([])
    groups.at(-1)?.push(chunk)
  }
  return groups
}
