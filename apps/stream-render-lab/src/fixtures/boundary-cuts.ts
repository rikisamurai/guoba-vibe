import type { StreamEvent } from '../protocol/types'
import type { ReplayRecord } from '../replay/replay-source'

export const BOUNDARY_CUTS_EVENTS: readonly StreamEvent[] = [
  { type: 'response.start', responseId: 'fixture-boundary-cuts' },
  { type: 'part.start', partId: 'answer', kind: 'answer' },
  {
    type: 'part.delta',
    partId: 'answer',
    delta: { kind: 'text', text: '可靠的流式渲染保留两份状态：\n\n' },
  },
  {
    type: 'part.delta',
    partId: 'answer',
    delta: { kind: 'text', text: '- **raw text** 是不可变事实；\n' },
  },
  {
    type: 'part.delta',
    partId: 'answer',
    delta: { kind: 'text', text: '- **display text** 服从显示时钟。\n\n```ts\n' },
  },
  {
    type: 'part.delta',
    partId: 'answer',
    delta: { kind: 'text', text: 'while (reader) {\n  // arrival ≠ display\n' },
  },
  {
    type: 'part.delta',
    partId: 'answer',
    delta: { kind: 'text', text: '}\n```' },
  },
  { type: 'part.end', partId: 'answer' },
  { type: 'response.end', outcome: { kind: 'completed', reason: 'fixture_end' } },
]

export function boundaryCutsReplayRecords(stepMs = 90): ReplayRecord[] {
  return BOUNDARY_CUTS_EVENTS.map((event, index) => ({ at: index * stepMs, event }))
}
