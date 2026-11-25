import { capabilityFor, type LiveProtocol } from './capability-data'

export interface LiveMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LiveRequest {
  protocol: LiveProtocol
  model: string
  messages: LiveMessage[]
}

export type ParseLiveResult = { ok: true; value: LiveRequest } | { ok: false; error: string }

const MAX_MESSAGES = 40
const MAX_CONTENT_LENGTH = 32_000
const MAX_TOTAL_CONTENT_LENGTH = 64_000

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseMessage(value: unknown): LiveMessage | string {
  if (!isRecord(value)) return 'each message must be an object'
  const { role, content } = value
  if (role !== 'system' && role !== 'user' && role !== 'assistant') {
    return 'message role must be system, user or assistant'
  }
  if (typeof content !== 'string' || content.length === 0) {
    return 'message content must be a non-empty string'
  }
  if (content.length > MAX_CONTENT_LENGTH) {
    return `message content exceeds ${MAX_CONTENT_LENGTH} characters`
  }
  return { role, content }
}

export function parseLiveRequest(body: unknown): ParseLiveResult {
  if (!isRecord(body)) return { ok: false, error: 'body must be a JSON object' }
  const { protocol, model, messages } = body
  if (typeof protocol !== 'string') return { ok: false, error: 'protocol is required' }
  const capability = capabilityFor(protocol)
  if (capability === null) return { ok: false, error: 'unknown protocol' }
  if (typeof model !== 'string' || !capability.models.includes(model)) {
    return { ok: false, error: `model is not enabled for ${protocol}` }
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return { ok: false, error: 'messages must be a non-empty array' }
  }
  if (messages.length > MAX_MESSAGES) {
    return { ok: false, error: `messages exceed ${MAX_MESSAGES}` }
  }
  const parsed: LiveMessage[] = []
  let totalContentLength = 0
  for (const message of messages) {
    const result = parseMessage(message)
    if (typeof result === 'string') return { ok: false, error: result }
    totalContentLength += result.content.length
    if (totalContentLength > MAX_TOTAL_CONTENT_LENGTH) {
      return {
        ok: false,
        error: `message content total exceeds ${MAX_TOTAL_CONTENT_LENGTH} characters`,
      }
    }
    parsed.push(result)
  }
  return { ok: true, value: { protocol: capability.id, model, messages: parsed } }
}
