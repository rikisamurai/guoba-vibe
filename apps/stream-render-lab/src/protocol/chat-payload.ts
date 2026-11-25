import { isJsonObject, objectField, parseJsonObject, stringField } from './json'

export interface ChatChoice {
  index: number
  delta?: {
    content?: string | null
    reasoning_content?: string | null
    tool_calls?: ChatToolCallDelta[]
  }
  finish_reason?: string | null
}

export interface ChatToolCallDelta {
  index: number
  id?: string
  type?: string
  function?: { name?: string; arguments?: string }
}

export interface ChatChunk {
  id?: string
  choices?: ChatChoice[]
  error?: { code?: string; message: string }
}

export function parseChatChunk(data: string): ChatChunk {
  const raw = parseJsonObject(data)
  const error = objectField(raw, 'error')
  if (error) {
    const code = error.code
    return {
      error: {
        ...(typeof code === 'string' || typeof code === 'number' ? { code: String(code) } : {}),
        message: stringField(error, 'message') ?? 'Chat provider failed',
      },
    }
  }
  if (!Array.isArray(raw.choices)) throw new TypeError('choices must be an array')
  const choices: ChatChoice[] = raw.choices.map((choice) => {
    if (!isJsonObject(choice)) throw new TypeError('choice must be an object')
    if (!Number.isInteger(choice.index) || Number(choice.index) < 0) {
      throw new TypeError('choice index must be a nonnegative integer')
    }
    const delta = objectField(choice, 'delta')
    return {
      index: Number(choice.index),
      ...(delta
        ? {
            delta: {
              ...('content' in delta ? { content: stringOrNull(delta.content) } : {}),
              ...('reasoning_content' in delta
                ? { reasoning_content: stringOrNull(delta.reasoning_content) }
                : {}),
              ...('tool_calls' in delta ? { tool_calls: parseToolCalls(delta.tool_calls) } : {}),
            },
          }
        : {}),
      ...('finish_reason' in choice ? { finish_reason: stringOrNull(choice.finish_reason) } : {}),
    }
  })
  return { ...(stringField(raw, 'id') ? { id: stringField(raw, 'id') } : {}), choices }
}

function parseToolCalls(value: unknown): ChatToolCallDelta[] {
  if (!Array.isArray(value)) throw new TypeError('tool_calls must be an array')
  return value.map((entry) => {
    if (!isJsonObject(entry) || typeof entry.index !== 'number') {
      throw new TypeError('tool call must contain a numeric index')
    }
    const callable = objectField(entry, 'function')
    return {
      index: entry.index,
      ...(stringField(entry, 'id') ? { id: stringField(entry, 'id') } : {}),
      ...(stringField(entry, 'type') ? { type: stringField(entry, 'type') } : {}),
      ...(callable
        ? {
            function: {
              ...(stringField(callable, 'name') ? { name: stringField(callable, 'name') } : {}),
              ...(stringField(callable, 'arguments') !== undefined
                ? { arguments: stringField(callable, 'arguments') }
                : {}),
            },
          }
        : {}),
    }
  })
}

function stringOrNull(value: unknown): string | null {
  if (value === null || typeof value === 'string') return value
  throw new TypeError('Expected a string or null')
}
