import type { SseEvent } from '../../05-sse/contract'
import type { ChatCompletionEvent } from '../contract'

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
