// Reference Chat Completions adapter for the embedded demos.
import type { SseEvent } from './sse'

export type ChatCompletionEvent =
  | { kind: 'reasoning-delta'; text: string }
  | { kind: 'content-delta'; text: string }
  | { kind: 'finish'; reason: string }
  | { kind: 'done' }

const CHAT_COMPLETIONS_WIRE = [
  'data: {"id":"chatcmpl-1","choices":[{"index":0,"delta":{"role":"assistant","reasoning_content":"先想"},"finish_reason":null}]}\n\n',
  'data: {"id":"chatcmpl-1","choices":[{"index":0,"delta":{"content":"再答"},"finish_reason":null}]}\n\n',
  'data: {"id":"chatcmpl-1","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}\n\n',
  'data: [DONE]\n\n',
].join('')

const encoded = new TextEncoder().encode(CHAT_COMPLETIONS_WIRE)
const splitPoints = [1, 4, 11, 23, 47, 83, 131, 197, encoded.length]

export const CHAT_COMPLETIONS_FIXTURE_CHUNKS = splitPoints.map((end, index) =>
  encoded.slice(splitPoints[index - 1] ?? 0, end),
)

interface ChatCompletionChoice {
  content?: string
  reasoning?: string
  finishReason?: string
}

export function adaptChatCompletions(events: readonly SseEvent[]): readonly ChatCompletionEvent[] {
  const output: ChatCompletionEvent[] = []

  for (const event of events) {
    if (event.data === '[DONE]') {
      output.push({ kind: 'done' })
      continue
    }

    for (const choice of parseChoices(event.data)) appendChoice(output, choice)
  }

  return output
}

function appendChoice(output: ChatCompletionEvent[], choice: ChatCompletionChoice): void {
  if (choice.reasoning) {
    output.push({ kind: 'reasoning-delta', text: choice.reasoning })
  }
  if (choice.content) {
    output.push({ kind: 'content-delta', text: choice.content })
  }
  if (choice.finishReason) {
    output.push({ kind: 'finish', reason: choice.finishReason })
  }
}

function parseChoices(data: string): ChatCompletionChoice[] {
  const value: unknown = JSON.parse(data)
  if (!isRecord(value) || !Array.isArray(value.choices)) {
    throw new Error('Malformed Chat Completions payload')
  }

  const choices: unknown[] = value.choices
  return choices.map((choice) => {
    if (!isRecord(choice) || !isRecord(choice.delta)) {
      throw new Error('Malformed Chat Completions choice')
    }
    const reasoning = optionalString(choice.delta.reasoning_content)
    const content = optionalString(choice.delta.content)
    const finishReason = optionalString(choice.finish_reason)
    return { reasoning, content, finishReason }
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function optionalString(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value === 'string') return value
  throw new Error('Expected an optional string')
}
