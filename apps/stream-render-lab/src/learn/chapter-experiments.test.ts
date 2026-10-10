import { describe, expect, it } from 'vitest'

import { CHAPTER_EXPERIMENTS } from './chapter-experiments'
import { CHAPTERS } from './chapters'

describe('chapter experiment registry', () => {
  it('gives every chapter a deterministic runnable engine configuration', () => {
    expect(Object.keys(CHAPTER_EXPERIMENTS)).toHaveLength(CHAPTERS.length)

    for (const chapter of CHAPTERS) {
      const experiment = CHAPTER_EXPERIMENTS[chapter.slug]
      expect(experiment, chapter.slug).toBeDefined()
      expect(experiment?.records[0]?.event.type).toBe('response.start')
      expect(experiment?.records.at(-1)?.event.type).toBe('response.end')
      expect(experiment?.records.map(({ at }) => at)).toEqual(
        experiment?.records.map(({ at }) => at).toSorted((left, right) => left - right),
      )
      expect(experiment?.records.some(({ event }) => event.type === 'part.delta')).toBe(true)
      expect(experiment?.trace).toBe('full')
    }
  })
})
