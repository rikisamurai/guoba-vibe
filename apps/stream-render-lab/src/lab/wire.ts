import type { LessonPresetId } from '@stream-render/contract'

import type { LabConfig, WireChunkRecord } from './types'

export interface WireChunk extends WireChunkRecord {
  bytes: Uint8Array
}

const ENCODER = new TextEncoder()
const DECODER = new TextDecoder('utf-8')

export function buildWireChunks(config: LabConfig): WireChunk[] {
  const wire = providerWire(config.input, config.presetId)
  const bytes = ENCODER.encode(wire)
  const random = mulberry32(config.seed)
  const chunks: WireChunk[] = []
  let start = 0

  while (start < bytes.length) {
    const requested = randomInt(random, config.chunkMin, config.chunkMax)
    const naturalEnd = Math.min(bytes.length, start + requested)
    const end =
      config.sliceMode === 'boundary-aware'
        ? nearestBoundary(bytes, start, naturalEnd, config.chunkMin)
        : naturalEnd
    const chunk = bytes.slice(start, Math.max(start + 1, end))
    const burst = random() * 100 < config.burstiness
    const delayMs =
      config.presetId === 'quick-start-burst'
        ? 0
        : burst
          ? config.delayMin
          : randomInt(random, config.delayMin, config.delayMax)
    chunks.push({
      bytes: chunk,
      index: chunks.length,
      byteLength: chunk.byteLength,
      delayMs,
      hex: [...chunk].map((byte) => byte.toString(16).padStart(2, '0')).join(' '),
      preview: DECODER.decode(chunk).replaceAll('\r', '↵').replaceAll('\n', '↲'),
    })
    start += chunk.byteLength
  }
  if (config.presetId === 'quick-start-burst') applyQuickStartCadence(chunks, config)
  return chunks
}

function applyQuickStartCadence(chunks: WireChunk[], config: LabConfig): void {
  const random = mulberry32(config.seed ^ 0x62757273)
  const [minimumSize, maximumSize] = burstSizeRange(config.burstiness)
  const groupSizes = balancedBurstSizes(chunks.length, minimumSize, maximumSize, random)
  let chunkIndex = 0

  for (const [groupIndex, groupSize] of groupSizes.entries()) {
    const microDelayMaximum = intraBurstDelayMaximum(groupSize, config.commitCadenceMs)
    for (let offset = 0; offset < groupSize; offset += 1) {
      const chunk = chunks[chunkIndex]
      if (!chunk) return
      chunk.delayMs =
        offset > 0
          ? randomInt(random, 0, microDelayMaximum)
          : groupIndex === 0
            ? 0
            : randomInt(random, config.delayMin, config.delayMax)
      chunkIndex += 1
    }
  }
}

function intraBurstDelayMaximum(groupSize: number, commitCadenceMs: number): number {
  if (groupSize <= 1) return 0
  const frameBudget = Math.max(0, Math.floor(commitCadenceMs) - 1)
  return Math.min(4, Math.floor(frameBudget / (groupSize - 1)))
}

function burstSizeRange(burstiness: number): [number, number] {
  const bounded = Math.min(99, Math.max(0, burstiness))
  const target = Math.min(12, Math.max(1, Math.round(100 / (100 - bounded))))
  return [Math.max(1, target - 1), target + 1]
}

function balancedBurstSizes(
  total: number,
  minimumSize: number,
  maximumSize: number,
  random: () => number,
): number[] {
  if (total < minimumSize) return [total]
  const minimumGroups = Math.ceil(total / maximumSize)
  const maximumGroups = Math.floor(total / minimumSize)
  const targetSize = Math.round((minimumSize + maximumSize) / 2)
  const targetGroups = Math.ceil(total / targetSize)
  const groupCount = Math.min(maximumGroups, Math.max(minimumGroups, targetGroups))
  const sizes = Array.from({ length: groupCount }, () => minimumSize)
  let remaining = total - groupCount * minimumSize

  while (remaining > 0) {
    const candidates = sizes.flatMap((size, index) => (size < maximumSize ? [index] : []))
    const index = candidates[randomInt(random, 0, candidates.length - 1)]
    if (index === undefined) break
    sizes[index] += 1
    remaining -= 1
  }
  return sizes
}

function providerWire(input: string, presetId: LessonPresetId): string {
  const deltas = splitProviderText(input, presetId)
  if (presetId === 'sse-edge-cases') return edgeCaseWire(deltas)
  const events = deltas.map((delta, index) => chatEvent(delta, index))
  events.push(chatEvent('', events.length, 'stop'))
  return `${events.map((event) => `data: ${event}\n\n`).join('')}data: [DONE]\n\n`
}

function edgeCaseWire(deltas: readonly string[]): string {
  let wire = '\uFEFF: initial heartbeat\r\nretry: 1200\r\n\r\n'
  deltas.forEach((delta, index) => {
    const json = chatEvent(delta, index)
    const pivot = json.indexOf(',"choices"') + 1
    wire += `id: edge-${index}\r: heartbeat\n`
    wire +=
      index % 2 === 0 && pivot > 0
        ? `data: ${json.slice(0, pivot)}\r\ndata: ${json.slice(pivot)}\r\n\r\n`
        : `data: ${json}\n\n`
  })
  wire += `data: ${chatEvent('', deltas.length, 'stop')}\r\rdata: [DONE]\r\r`
  return wire
}

function chatEvent(delta: string, index: number, finishReason: string | null = null): string {
  return JSON.stringify({
    id: 'lab-replay',
    object: 'chat.completion.chunk',
    choices: [
      { index: 0, delta: delta === '' ? {} : { content: delta }, finish_reason: finishReason },
    ],
  })
}

function splitProviderText(input: string, presetId: LessonPresetId): string[] {
  const points = Array.from(input || 'Empty input')
  const size = presetId === 'm1-frame-batching' ? 1 : presetId === 'sse-edge-cases' ? 7 : 11
  const chunks: string[] = []
  for (let index = 0; index < points.length; index += size) {
    chunks.push(points.slice(index, index + size).join(''))
  }
  return chunks
}

function nearestBoundary(bytes: Uint8Array, start: number, end: number, minimum: number): number {
  const floor = Math.min(end, start + Math.max(1, minimum))
  for (let index = end - 1; index >= floor; index -= 1) {
    if (isBoundary(bytes[index])) return index + 1
  }
  return end
}

function isBoundary(byte: number | undefined): boolean {
  return byte === 0x0a || byte === 0x0d || byte === 0x20 || byte === 0x2c || byte === 0x2e
}

function randomInt(random: () => number, minimum: number, maximum: number): number {
  const low = Math.max(0, Math.min(minimum, maximum))
  const high = Math.max(low, maximum)
  return low + Math.floor(random() * (high - low + 1))
}

function mulberry32(seed: number): () => number {
  let value = seed >>> 0
  return () => {
    value = (value + 0x6d2b79f5) | 0
    let mixed = Math.imul(value ^ (value >>> 15), 1 | value)
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296
  }
}
