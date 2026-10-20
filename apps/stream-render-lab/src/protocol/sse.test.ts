import { describe, expect, it } from 'vitest'

import { parseSse, parseSseText } from './sse'

const encoder = new TextEncoder()

async function collect(chunks: Uint8Array[]) {
  const events = []
  for await (const event of parseSse(from(chunks))) events.push(event)
  return events
}

async function* from<T>(items: T[]): AsyncGenerator<T> {
  yield* items
}

describe('parseSse', () => {
  it('parses decoded text independently from the UTF-8 transport seam', async () => {
    await expect(collectText(['data: hel', 'lo\n\n'])).resolves.toEqual([{ data: 'hello' }])
  })

  it('follows the event-stream field and line rules', async () => {
    const wire = [
      '\uFEFF: keep-alive\r\n',
      'event: answer\r',
      'id: 7\n',
      'retry: 1500\r\n',
      'data:first\n',
      'data: second\r\n',
      'unknown: ignored\r\n',
      '\r\n',
      'data: next\n\n',
    ].join('')

    await expect(collect([encoder.encode(wire)])).resolves.toEqual([
      { control: 'retry', retry: 1500 },
      { event: 'answer', data: 'first\nsecond', id: '7' },
      { data: 'next', id: '7' },
    ])
  })

  it('decodes UTF-8 correctly across every byte boundary', async () => {
    const bytes = encoder.encode('data: 你🙂\n\n')
    const chunks = Array.from(bytes, (byte) => Uint8Array.of(byte))

    await expect(collect(chunks)).resolves.toEqual([{ data: '你🙂' }])
  })

  it('ignores invalid id/retry fields and discards an event left open at EOF', async () => {
    const wire = [
      'id: safe\n',
      'data: one\n\n',
      'id: bad\0id\n',
      'retry: 2.5\n',
      'data: two\n\n',
      'data: never dispatched',
    ].join('')

    await expect(collect([encoder.encode(wire)])).resolves.toEqual([
      { data: 'one', id: 'safe' },
      { data: 'two', id: 'safe' },
    ])
  })

  it('preserves an explicit empty id as a reset of the last event id', async () => {
    const wire = 'id: prior\ndata: one\n\nid:\ndata: two\n\n'

    await expect(collect([encoder.encode(wire)])).resolves.toEqual([
      { data: 'one', id: 'prior' },
      { data: 'two', id: '' },
    ])
  })

  it('emits a retry-only control update instead of silently dropping it', async () => {
    await expect(collect([encoder.encode('retry: 2500\n\n')])).resolves.toEqual([
      { control: 'retry', retry: 2500 },
    ])
  })

  it('applies retry immediately without waiting for event dispatch', async () => {
    await expect(collect([encoder.encode('retry: 900\n')])).resolves.toEqual([
      { control: 'retry', retry: 900 },
    ])
  })
})

async function collectText(chunks: string[]) {
  const events = []
  for await (const event of parseSseText(from(chunks))) events.push(event)
  return events
}
