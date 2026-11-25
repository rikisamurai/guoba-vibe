import { describe, expect, it } from 'vitest'

import { REPRO_CASES } from './repro-cases'

describe('repro cases', () => {
  it('derives displayed raw input from the exact replay deltas', () => {
    for (const item of Object.values(REPRO_CASES)) {
      const replayRaw = item.records
        .flatMap(({ event }) =>
          event.type === 'part.delta' && event.delta.kind === 'text' ? [event.delta.text] : [],
        )
        .join('')

      expect(replayRaw).toBe(item.raw)
      expect(item.records.at(-1)?.event.type).toBe('response.end')
    }
  })

  it('stores the broken fence with real newlines instead of escaped text', () => {
    const brokenFence = REPRO_CASES['broken-fence']

    expect(brokenFence.raw).toContain('```ts\nconst answer')
    expect(brokenFence.raw).not.toContain('\\n')
  })

  it('reassembles the split grapheme exactly at terminal state', () => {
    expect(REPRO_CASES['split-emoji'].raw).toBe('完成了：👩‍💻')
  })
})
