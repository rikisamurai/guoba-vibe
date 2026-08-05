import {
  buildSseTranscript,
  FIXTURE_MARKDOWN,
  sliceBurst,
  sliceJitter,
  sliceUniform,
  splitAdversarial,
  splitUniform,
  wireChunksToStream,
} from 'stream-render-core'

export type ContentStrategy = 'adversarial' | 'uniform'
export type WireStrategy = 'jitter' | 'uniform' | 'burst'

export interface ReplayConfig {
  content: ContentStrategy
  wire: WireStrategy
  speed: number
}

export const CONTENT_LABELS: Record<ContentStrategy, string> = {
  adversarial: '恶意（标记后切刀）',
  uniform: '均匀（3 字符）',
}

export const WIRE_LABELS: Record<WireStrategy, string> = {
  jitter: 'jitter（随机抖动）',
  uniform: '均匀（64B/30ms）',
  burst: 'burst（代理缓冲）',
}

export function buildReplayStream(config: ReplayConfig): ReadableStream<Uint8Array> {
  const deltas =
    config.content === 'adversarial'
      ? splitAdversarial(FIXTURE_MARKDOWN)
      : splitUniform(FIXTURE_MARKDOWN, 3)
  const transcript = buildSseTranscript(deltas)
  const chunks =
    config.wire === 'jitter'
      ? sliceJitter(transcript, { seed: 42 })
      : config.wire === 'burst'
        ? sliceBurst(transcript)
        : sliceUniform(transcript)
  return wireChunksToStream(chunks, config.speed)
}

export function describeReplay(config: ReplayConfig): string {
  return `▶ 回放 · ${CONTENT_LABELS[config.content]} · ${WIRE_LABELS[config.wire]} · ${config.speed}x`
}
