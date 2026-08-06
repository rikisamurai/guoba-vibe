import { VirtualClock } from '../../src/engine/clock'
import type { SseImplementation } from '../05-sse/contract'
import type { FrameBatcherImplementation } from '../10-m1-frame-batching/contract'

export interface MiniChatResult {
  raw: string
  visible: string
  deltas: number
  commits: number
  terminal: boolean
  pendingTasks: number
}

interface ChatWireChunk {
  choices?: { index?: unknown; delta?: { content?: unknown } }[]
}

export async function runMiniChat(
  wire: string,
  parseSse: SseImplementation,
  createBatcher: FrameBatcherImplementation,
): Promise<MiniChatResult> {
  const clock = new VirtualClock()
  let raw = ''
  let visible = ''
  let commits = 0
  let deltas = 0
  let terminal = false
  const batcher = createBatcher(clock, (batch) => {
    visible += batch
    commits += 1
  })

  for (const event of await parseSse(everyByte(wire))) {
    if ('control' in event) continue
    if (event.data === '[DONE]') {
      terminal = true
      batcher.drain()
      continue
    }
    const content = readContent(event.data)
    if (content === '') continue
    raw += content
    deltas += 1
    batcher.push(content)
  }

  clock.runUntilIdle()
  return { raw, visible, deltas, commits, terminal, pendingTasks: clock.pendingCount }
}

function readContent(data: string): string {
  const parsed: unknown = JSON.parse(data)
  if (!isRecord(parsed) || !Array.isArray(parsed.choices)) return ''
  const chunk = parsed as ChatWireChunk
  const content = chunk.choices?.find((choice) => choice.index === 0)?.delta?.content
  return typeof content === 'string' ? content : ''
}

async function* everyByte(wire: string): AsyncGenerator<Uint8Array> {
  for (const byte of new TextEncoder().encode(wire)) yield Uint8Array.of(byte)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
