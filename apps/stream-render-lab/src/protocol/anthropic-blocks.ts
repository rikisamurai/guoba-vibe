import type { PartDelta, PartKind, RunOutcome, StreamEvent } from './types'

export interface AnthropicPayload {
  type?: string
  index?: number
  message?: { id?: string }
  content_block?: { type?: string; id?: string; input?: unknown }
  delta?: {
    type?: string
    text?: string
    thinking?: string
    partial_json?: string
    stop_reason?: string | null
  }
  error?: { type?: string; message?: string }
}

export interface OpenBlock {
  id: string
  kind: PartKind
  index: number
  json: string
  initialInput?: unknown
}

export function startBlock(
  payload: AnthropicPayload,
  blocks: Map<number, OpenBlock>,
  events: StreamEvent[],
): RunOutcome | undefined {
  if (typeof payload.index !== 'number' || !payload.content_block?.type) {
    return failure('content_block_start needs index and content_block.type')
  }
  if (blocks.has(payload.index)) return failure('Content block started twice')
  const kind = blockKind(payload.content_block.type)
  if (!kind) return failure(`Unsupported content block: ${payload.content_block.type}`)
  const id = payload.content_block.id ?? `block:${payload.index}`
  blocks.set(payload.index, {
    id,
    kind,
    index: payload.index,
    json: '',
    ...('input' in payload.content_block ? { initialInput: payload.content_block.input } : {}),
  })
  events.push({ type: 'part.start', partId: id, kind })
  return undefined
}

export function appendDelta(
  payload: AnthropicPayload,
  blocks: Map<number, OpenBlock>,
  events: StreamEvent[],
): RunOutcome | undefined {
  if (typeof payload.index !== 'number' || !blocks.has(payload.index)) {
    return failure('content_block_delta references an unopened block')
  }
  const block = blocks.get(payload.index)!
  const delta = blockDelta(payload.delta)
  if (!delta) {
    events.push({
      type: 'diagnostic',
      level: 'info',
      code: 'anthropic_unknown_delta',
      message: `Ignored Anthropic delta: ${payload.delta?.type ?? 'missing'}`,
    })
    return undefined
  }
  if (delta.kind === 'json') block.json += delta.fragment
  events.push({ type: 'part.delta', partId: block.id, delta })
  return undefined
}

export function stopBlock(
  payload: AnthropicPayload,
  blocks: Map<number, OpenBlock>,
  events: StreamEvent[],
): RunOutcome | undefined {
  if (typeof payload.index !== 'number' || !blocks.has(payload.index)) {
    return failure('content_block_stop references an unopened block')
  }
  const block = blocks.get(payload.index)!
  events.push({ type: 'part.end', partId: block.id })
  blocks.delete(payload.index)
  if (block.kind === 'tool-call') {
    try {
      JSON.parse(block.json || JSON.stringify(block.initialInput ?? {}))
    } catch {
      return failure('Tool input is not valid JSON at block stop')
    }
  }
  return undefined
}

export function appendOpenBlockEnds(blocks: Map<number, OpenBlock>, events: StreamEvent[]): void {
  for (const block of blocks.values()) events.push({ type: 'part.end', partId: block.id })
  blocks.clear()
}

function blockKind(type: string): PartKind | undefined {
  if (type === 'text') return 'answer'
  if (type === 'thinking' || type === 'redacted_thinking') return 'reasoning'
  if (type === 'tool_use' || type === 'server_tool_use') return 'tool-call'
  return undefined
}

function blockDelta(delta: AnthropicPayload['delta']): PartDelta | undefined {
  if (delta?.type === 'text_delta') return { kind: 'text', text: delta.text ?? '' }
  if (delta?.type === 'thinking_delta') return { kind: 'text', text: delta.thinking ?? '' }
  if (delta?.type === 'input_json_delta') {
    return { kind: 'json', fragment: delta.partial_json ?? '' }
  }
  return undefined
}

function failure(message: string): RunOutcome {
  return { kind: 'failed', failure: { kind: 'protocol', message } }
}
