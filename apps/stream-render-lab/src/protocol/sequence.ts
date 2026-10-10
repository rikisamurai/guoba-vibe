import type { InternalEnvelope, SourceEvent } from './types'

export async function* sequenceEvents(
  events: AsyncIterable<SourceEvent>,
): AsyncGenerator<InternalEnvelope> {
  let internalSeq = 0
  for await (const sourceEvent of events) {
    yield { ...sourceEvent, internalSeq }
    internalSeq += 1
  }
}
