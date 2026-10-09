import { describe, expect, it, vi } from 'vitest'

import type { ExternalRendererDriver } from './harness'
import { runExternalRendererComparison } from './harness'

function fakeDriver(project: (raw: string) => string) {
  const updates: Array<{ atMs: number; final: boolean; raw: string }> = []
  const dispose = vi.fn()
  const driver: ExternalRendererDriver = {
    dispose,
    inspect: () => ({
      commits: updates.length,
      longTasks: 0,
      textContent: project(updates.at(-1)?.raw ?? ''),
    }),
    update: async (raw, final, atMs) => {
      updates.push({ atMs, final, raw })
    },
  }
  return { dispose, driver, updates }
}

describe('isolated external renderer comparison', () => {
  it('feeds identical cumulative raw and one final update to every adapter', async () => {
    const first = fakeDriver((raw) => raw)
    const second = fakeDriver((raw) => raw)
    const records = [
      { atMs: 0, delta: 'hello' },
      { atMs: 8, delta: ' **world**' },
    ]

    const results = await runExternalRendererComparison(
      [
        { create: () => first.driver, id: 'streamdown', version: 'fixture' },
        { create: () => second.driver, id: 'markstream', version: 'fixture' },
      ],
      records,
      'hello **world**',
    )

    expect(first.updates).toEqual(second.updates)
    expect(first.updates.at(-1)?.final).toBe(true)
    expect(results.every((result) => result.terminalEquivalent)).toBe(true)
    expect(first.dispose).toHaveBeenCalledOnce()
    expect(second.dispose).toHaveBeenCalledOnce()
  })

  it('invalidates performance comparison when terminal text differs', async () => {
    const broken = fakeDriver((raw) => raw.slice(0, -1))
    const [result] = await runExternalRendererComparison(
      [{ create: () => broken.driver, id: 'lobe-ui', version: 'fixture' }],
      [{ atMs: 0, delta: 'answer' }],
      'answer',
    )

    expect(result?.terminalEquivalent).toBe(false)
  })
})
