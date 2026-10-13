import { afterEach, expect, it, vi } from 'vitest'

import { fixtureResponse, teachingPacket } from './lifecycle-checks'

afterEach(() => {
  vi.doUnmock('../my-chat/read-event')
  vi.resetModules()
})

it('learner edits affect both the browser registry reader and shared acceptance, leaving reference independent', async () => {
  vi.resetModules()
  vi.doMock('../my-chat/read-event', () => ({
    createEventReader: () => (data: string) =>
      data === '[DONE]'
        ? { outcome: { kind: 'completed', reason: 'done' } }
        : { text: 'learner-edited-output' },
  }))
  const { implementations } = await import('./implementations')
  const { runAcceptance } = await import('./checks')
  const read = async (source: 'mine' | 'reference') => {
    let text = ''
    await implementations[source].readAnswer(
      fixtureResponse([new TextEncoder().encode(teachingPacket + 'data: [DONE]\n\n')]),
      {
        signal: new AbortController().signal,
        onText: (delta) => {
          text += delta
        },
      },
    )
    return text
  }
  expect(await read('mine')).toBe('learner-edited-output')
  expect(await read('reference')).toBe('你好')
  const check = (await runAcceptance(implementations.mine, 'provider')).find(
    (item) => item.id === 'provider-content',
  )!
  expect(check.passed).toBe(false)
  expect(check.actual).toBe('"learner-edited-output"')
})
