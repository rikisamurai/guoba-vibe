import type { LiveProtocol } from './capability-data'
import type { LiveRequest } from './schema'

interface UpstreamRequest {
  url: string
  headers: HeadersInit
  body: string
}

function chatBody(input: LiveRequest): Record<string, unknown> {
  return { model: input.model, stream: true, messages: input.messages }
}

function responsesBody(input: LiveRequest): Record<string, unknown> {
  return { model: input.model, stream: true, input: input.messages }
}

function anthropicBody(input: LiveRequest): Record<string, unknown> {
  const system = input.messages
    .filter((message) => message.role === 'system')
    .map((message) => message.content)
    .join('\n\n')
  const messages = input.messages.filter((message) => message.role !== 'system')
  return {
    model: input.model,
    stream: true,
    max_tokens: 4096,
    ...(system === '' ? {} : { system }),
    messages,
  }
}

function urlFor(protocol: LiveProtocol): string {
  if (protocol === 'responses') return 'https://api.deepseek.com/responses'
  if (protocol === 'anthropic') return 'https://api.deepseek.com/anthropic/v1/messages'
  return 'https://api.deepseek.com/chat/completions'
}

export function buildUpstreamRequest(input: LiveRequest, key: string): UpstreamRequest {
  const anthropic = input.protocol === 'anthropic'
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    ...(anthropic
      ? { 'x-api-key': key, 'anthropic-version': '2023-06-01' }
      : { authorization: `Bearer ${key}` }),
  }
  const payload = anthropic
    ? anthropicBody(input)
    : input.protocol === 'responses'
      ? responsesBody(input)
      : chatBody(input)
  return { url: urlFor(input.protocol), headers, body: JSON.stringify(payload) }
}
