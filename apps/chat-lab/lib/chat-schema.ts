export interface ChatRequestMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatRequest {
  provider: string
  model: string
  messages: ChatRequestMessage[]
}

export type ParseResult = { ok: true; value: ChatRequest } | { ok: false; error: string }

const MAX_MESSAGES = 40
const MAX_CONTENT_LENGTH = 32_000

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function parseChatRequest(body: unknown): ParseResult {
  if (!isRecord(body)) return { ok: false, error: 'body must be a JSON object' }
  const { provider, model, messages } = body

  if (typeof provider !== 'string' || provider === '') {
    return { ok: false, error: 'provider is required' }
  }
  if (typeof model !== 'string' || model === '') {
    return { ok: false, error: 'model is required' }
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return { ok: false, error: 'messages must be a non-empty array' }
  }
  if (messages.length > MAX_MESSAGES) {
    return { ok: false, error: `messages capped at ${MAX_MESSAGES}` }
  }

  const parsed: ChatRequestMessage[] = []
  for (const entry of messages) {
    if (!isRecord(entry)) return { ok: false, error: 'each message must be an object' }
    const { role, content } = entry
    if (role !== 'system' && role !== 'user' && role !== 'assistant') {
      return { ok: false, error: 'message role must be system, user or assistant' }
    }
    if (typeof content !== 'string' || content === '') {
      return { ok: false, error: 'message content must be a non-empty string' }
    }
    if (content.length > MAX_CONTENT_LENGTH) {
      return { ok: false, error: 'message content too long' }
    }
    parsed.push({ role, content })
  }
  return { ok: true, value: { provider, model, messages: parsed } }
}
