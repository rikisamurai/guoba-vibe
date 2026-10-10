import type { StreamSource } from '../engine/types'
import { adaptProtocolStream, type SourceEvent, type WireProtocol } from '../protocol'

export interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

interface DeepSeekSourceOptions {
  fetch?: Fetcher
  protocol: WireProtocol
  model: string
  messages: DeepSeekMessage[]
}

async function* responseBytes(
  stream: ReadableStream<Uint8Array>,
  signal: AbortSignal,
): AsyncGenerator<Uint8Array> {
  const reader = stream.getReader()
  try {
    while (!signal.aborted) {
      // oxlint-disable-next-line no-await-in-loop -- wire chunks must retain transport order
      const { done, value } = await reader.read()
      if (done) return
      yield value
    }
  } finally {
    reader.releaseLock()
  }
}

function origin(protocol: WireProtocol): SourceEvent['origin'] {
  if (protocol === 'responses') return { protocol, sequenceNumber: -1 }
  if (protocol === 'anthropic') return { protocol }
  return { protocol, choiceIndex: 0 }
}

async function rejection(response: Response): Promise<{ code: string; message: string }> {
  try {
    const payload: unknown = await response.json()
    if (typeof payload === 'object' && payload !== null && 'error' in payload) {
      const code = String(payload.error)
      return { code, message: code }
    }
  } catch {
    // A non-JSON proxy response still becomes an explicit provider failure.
  }
  return { code: `http_${response.status}`, message: `Live proxy rejected with ${response.status}` }
}

export class DeepSeekSource implements StreamSource {
  private readonly fetcher: Fetcher

  constructor(private readonly options: DeepSeekSourceOptions) {
    this.fetcher = options.fetch ?? globalThis.fetch.bind(globalThis)
  }

  async *open(signal: AbortSignal): AsyncGenerator<SourceEvent> {
    const response = await this.fetcher('/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        protocol: this.options.protocol,
        model: this.options.model,
        messages: this.options.messages,
      }),
      signal,
    })
    if (!response.ok) {
      const failure = await rejection(response)
      yield {
        sourceEventOrdinal: 0,
        splitIndex: 0,
        origin: origin(this.options.protocol),
        event: {
          type: 'response.end',
          outcome: { kind: 'failed', failure: { kind: 'provider', ...failure } },
        },
      }
      return
    }
    if (!response.body) throw new Error('Live proxy returned an empty stream')
    yield* adaptProtocolStream(this.options.protocol, responseBytes(response.body, signal))
  }
}
