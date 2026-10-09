import type { ParsedEventStream } from '../contract'

export function parseEventStream(_chunks: readonly Uint8Array[]): ParsedEventStream {
  // TODO 05: decode complete lines, apply SSE fields, dispatch on blank lines.
  return { events: [], lastEventId: '' }
}
