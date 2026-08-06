import type { EngineClock } from '../engine/clock'
import type { StreamSource } from '../engine/types'
import { adaptChatCompletions } from '../protocol/chat-completions'
import { parseSseText } from '../protocol/sse'
import type { SourceEvent } from '../protocol/types'
import { decodeUtf8 } from '../protocol/utf8'
import { TimedReplay } from '../replay/replay-source'
import type { AbProfileConfig, ProfileTimelineSample } from './ab-types'

const MARKDOWN_BLOCK = `## Streaming Markdown\n\n网络到达频率不等于浏览器适合提交 UI 的频率。\n\n- raw 是事实源\n- visible 服从显示时钟\n\n\`\`\`ts\nrequestAnimationFrame(() => commit(raw))\n\`\`\`\n\n`

export type TimelineRecorder = (sample: ProfileTimelineSample) => void

export function createProfileSource(
  clock: EngineClock,
  config: AbProfileConfig,
  record: TimelineRecorder,
): StreamSource {
  return {
    async *open(signal: AbortSignal): AsyncGenerator<SourceEvent> {
      const startedAt = clock.now()
      const wire = buildChatWire(config.sizeKb, config.chunkSize)
      const chunks = splitBytes(new TextEncoder().encode(wire), config.chunkSize * 4)
      const replay = new TimedReplay(
        clock,
        chunks.map((value, index) => ({ at: index * config.cadenceMs, value })),
      )
      const bytes = observeBytes(replay.open(signal), clock, startedAt, record)
      const text = decodeUtf8(bytes, {
        onChunk: ({ byteLength }) =>
          point(record, clock, startedAt, 'decode', `${byteLength} bytes decoded`),
        onFlush: () => point(record, clock, startedAt, 'decode', 'decoder flushed'),
      })
      const sse = parseSseText(text, {
        onDispatch: () => point(record, clock, startedAt, 'sse', 'SSE event dispatched'),
      })
      for await (const event of adaptChatCompletions(sse)) {
        point(record, clock, startedAt, 'provider', event.event.type)
        yield event
      }
    },
  }
}

function buildChatWire(sizeKb: number, deltaSize: number): string {
  const target = sizeKb * 1024
  const raw = MARKDOWN_BLOCK.repeat(Math.ceil(target / MARKDOWN_BLOCK.length)).slice(0, target)
  const deltas = splitText(raw, deltaSize)
  const frames = deltas.map((content, index) =>
    frame({
      id: 'profile-fixture',
      choices: [{ index: 0, delta: { content }, finish_reason: null }],
      created: index,
    }),
  )
  frames.push(
    frame({
      id: 'profile-fixture',
      choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
    }),
  )
  frames.push('data: [DONE]\n\n')
  return frames.join('')
}

function frame(value: unknown): string {
  return `data: ${JSON.stringify(value)}\n\n`
}

function splitText(value: string, size: number): string[] {
  const chunks: string[] = []
  for (let offset = 0; offset < value.length; offset += size) {
    chunks.push(value.slice(offset, offset + size))
  }
  return chunks
}

function splitBytes(value: Uint8Array, size: number): Uint8Array[] {
  const chunks: Uint8Array[] = []
  for (let offset = 0; offset < value.byteLength; offset += size) {
    chunks.push(value.slice(offset, offset + size))
  }
  return chunks
}

async function* observeBytes(
  input: AsyncIterable<Uint8Array>,
  clock: EngineClock,
  startedAt: number,
  record: TimelineRecorder,
): AsyncGenerator<Uint8Array> {
  for await (const bytes of input) {
    point(record, clock, startedAt, 'network', `${bytes.byteLength} synthetic replay bytes arrived`)
    yield bytes
  }
}

function point(
  record: TimelineRecorder,
  clock: EngineClock,
  startedAt: number,
  layer: ProfileTimelineSample['layer'],
  label: string,
): void {
  record({ layer, label, startMs: clock.now() - startedAt, durationMs: 0 })
}
