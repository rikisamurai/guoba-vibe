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
  onObservation?: (observation: LiveSourceObservation) => void
}

export interface LiveSourceObservation {
  stage: 'headers' | 'first-byte' | 'reasoning' | 'content'
  detail: string
}

async function* responseBytes(
  stream: ReadableStream<Uint8Array>,
  signal: AbortSignal,
  onFirstByte: (size: number) => void,
): AsyncGenerator<Uint8Array> {
  const reader = stream.getReader()
  let received = false
  try {
    while (!signal.aborted) {
      // oxlint-disable-next-line no-await-in-loop -- wire chunks must retain transport order
      const { done, value } = await reader.read()
      if (done) return
      if (!received && value.byteLength > 0) {
        received = true
        onFirstByte(value.byteLength)
      }
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
      const detail = 'detail' in payload && typeof payload.detail === 'string' ? payload.detail : ''
      const status =
        'status' in payload && typeof payload.status === 'number' ? payload.status : null
      const suffix =
        status === null ? detail : [`upstream ${status}`, detail].filter(Boolean).join(': ')
      return { code, message: suffix === '' ? code : `${code}: ${suffix}` }
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
    this.observe({
      stage: 'headers',
      detail: `HTTP ${response.status} · ${response.headers.get('content-type') ?? 'unknown type'}`,
    })
    if (!response.ok) {
      const failure = await rejection(response)
      yield {
        sourceEventOrdinal: 0,
        splitIndex: 0,
        origin: origin(this.options.protocol),
        event: {
          type: 'diagnostic',
          level: 'warning',
          code: failure.code,
          message: failure.message,
        },
      }
      yield {
        sourceEventOrdinal: 0,
        splitIndex: 1,
        origin: origin(this.options.protocol),
        event: {
          type: 'response.end',
          outcome: { kind: 'failed', failure: { kind: 'provider', ...failure } },
        },
      }
      return
    }
    if (!response.body) throw new Error('Live proxy returned an empty stream')
    const parts = new Map<string, string>()
    const observed = new Set<string>()
    const bytes = responseBytes(response.body, signal, (size) => {
      this.observe({ stage: 'first-byte', detail: `${size} bytes accepted` })
    })
    for await (const sourceEvent of adaptProtocolStream(this.options.protocol, bytes)) {
      const event = sourceEvent.event
      if (event.type === 'part.start') parts.set(event.partId, event.kind)
      if (event.type === 'part.delta') {
        const kind = parts.get(event.partId)
        if ((kind === 'reasoning' || kind === 'answer') && !observed.has(kind)) {
          observed.add(kind)
          this.observe({
            stage: kind === 'reasoning' ? 'reasoning' : 'content',
            detail: `${this.options.protocol} ${kind} delta`,
          })
        }
      }
      yield sourceEvent
    }
  }

  private observe(observation: LiveSourceObservation): void {
    this.options.onObservation?.(observation)
  }
}
