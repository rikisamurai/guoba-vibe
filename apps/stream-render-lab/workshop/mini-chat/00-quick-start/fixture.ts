import type { ReplayRecord } from '../../../src/replay'

export const QUICK_START_RAW = 'raw 记录到达事实，visible 服从显示时钟。'

const chunks = ['raw 记录', '到达事实，', 'visible ', '服从显示时钟。']

export const QUICK_START_TRACE: readonly ReplayRecord[] = [
  { at: 0, event: { type: 'response.start', responseId: 'quick-start' } },
  { at: 0, event: { type: 'part.start', partId: 'answer', kind: 'answer' } },
  ...chunks.map(
    (text, index): ReplayRecord => ({
      at: index + 1,
      event: { type: 'part.delta', partId: 'answer', delta: { kind: 'text', text } },
    }),
  ),
  { at: 5, event: { type: 'part.end', partId: 'answer' } },
  {
    at: 6,
    event: {
      type: 'response.end',
      outcome: { kind: 'completed', reason: 'quick_start_fixture_end' },
    },
  },
]
