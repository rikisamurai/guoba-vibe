import { describe, expect, it } from 'vitest'

import { BrowserClock } from '../engine/clock'
import { createStreamingRenderEngine } from '../engine/create-engine'
import { myRenderPolicy } from '../my-chat/render-policy'
import { DEFAULT_AB_CONFIG } from './ab-types'
import { checkProfileCorrectness } from './profile-correctness'
import { buildProfileText, PROFILE_FIXTURES } from './profile-fixtures'
import { resolveProfile } from './profile-options'
import { createProfileSource } from './profile-wire-source'

function testClock() {
  return new BrowserClock({
    now: () => performance.now(),
    requestFrame: (task) => setTimeout(() => task(performance.now()), 1),
    cancelFrame: (handle) => clearTimeout(handle),
    setTimer: (task, ms) => setTimeout(task, ms),
    clearTimer: (handle) => clearTimeout(handle),
  })
}

describe('profiler inputs and final correctness', () => {
  it.each(PROFILE_FIXTURES)('replays the exact fixed text for $value', async ({ value }) => {
    const config = {
      ...DEFAULT_AB_CONFIG,
      fixture: value,
      textKChars: 1,
      chunkSize: 13,
      cadenceMs: 0,
    }
    const source = createProfileSource(testClock(), config, () => {})
    let raw = ''
    let terminal = ''
    for await (const { event } of source.open(new AbortController().signal)) {
      if (event.type === 'part.delta' && event.delta.kind === 'text') raw += event.delta.text
      if (event.type === 'response.end') terminal = event.outcome.kind
    }
    expect(raw).toBe(buildProfileText(config))
    expect(raw.length).toBe(1024)
    expect(terminal).toBe('completed')
  })

  it.each(['M0', 'M1', 'M2', 'M3', 'M4'] as const)(
    'validates %s against the input oracle',
    async (profile) => {
      const clock = testClock()
      const config = {
        ...DEFAULT_AB_CONFIG,
        fixture: 'stable-paragraphs' as const,
        textKChars: 0.25,
        chunkSize: 13,
        cadenceMs: 0,
      }
      const run = createStreamingRenderEngine({ clock }).start({
        source: createProfileSource(clock, config, () => {}),
        profile,
        reveal: 'direct',
        trace: 'off',
      })
      const { snapshot } = await run.settled
      expect(checkProfileCorrectness(snapshot, buildProfileText(config))).toEqual({
        raw: true,
        visible: true,
        canonical: true,
        completed: true,
      })
      const broken = {
        ...snapshot,
        parts: snapshot.parts.map((part) => ({ ...part, visible: part.visible.slice(0, -1) })),
      }
      expect(checkProfileCorrectness(broken, buildProfileText(config)).visible).toBe(false)
      expect(checkProfileCorrectness(snapshot, `${buildProfileText(config)}missing`).raw).toBe(
        false,
      )
    },
  )

  it('reads the editable learner policy instead of a hardcoded challenger', () => {
    const original = myRenderPolicy.profile
    try {
      myRenderPolicy.profile = 'M3'
      expect(resolveProfile('mine')).toBe('M3')
      expect(resolveProfile('M1')).toBe('M1')
    } finally {
      myRenderPolicy.profile = original
    }
  })
})
