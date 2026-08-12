import type { RunOutcome, StreamEvent } from '../protocol/types'
import type { ReplayRecord } from '../replay/replay-source'

interface TextReplayOptions {
  chunks: readonly string[]
  id: string
  outcome?: RunOutcome
  stepMs?: number
}

export function textReplayRecords({
  chunks,
  id,
  outcome = { kind: 'completed', reason: 'fixture_end' },
  stepMs = 72,
}: TextReplayOptions): ReplayRecord[] {
  const events: StreamEvent[] = [
    { type: 'response.start', responseId: id },
    { type: 'part.start', partId: 'answer', kind: 'answer' },
    ...chunks.map(
      (text): StreamEvent => ({
        type: 'part.delta',
        partId: 'answer',
        delta: { kind: 'text', text },
      }),
    ),
    { type: 'part.end', partId: 'answer' },
    { type: 'response.end', outcome },
  ]

  return events.map((event, index) => ({ at: index * stepMs, event }))
}
