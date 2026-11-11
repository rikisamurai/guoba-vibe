import { afterEach, describe, expect, it, vi } from 'vitest'

import { GET } from '../../api/teaching'
import type { ReadRecord } from '../practice/types'
import { readAnswer } from '../reference-chat/read-answer'

afterEach(() => vi.useRealTimers())

async function inspect(mode: string) {
  const records: ReadRecord[] = []
  let answer = ''
  const result = readAnswer(GET(new Request(`http://local/api/teaching?mode=${mode}`)), {
    signal: new AbortController().signal,
    onRecord: (record) => records.push(record),
    onText: (text) => {
      answer += text
    },
  })
  await vi.runAllTimersAsync()
  return { records, answer, outcome: await result }
}

describe('network trace of the selected reference reader', () => {
  it('links each actual read to its decoder emission, event data and accepted text', async () => {
    vi.useFakeTimers()
    // This in-process Response preserves source writes; a browser may merge them.
    const { records, answer, outcome } = await inspect('split')
    expect(outcome.kind).toBe('completed')
    expect(records[0].bytes.length).toBeGreaterThan(0)
    expect(records[0].decoded).toContain('data:')
    expect(records[0].decoded).not.toContain('�')
    expect(records[0].events).toEqual([])
    expect(records[0].text).toEqual([])
    expect(records[1].events[0]).toContain('你好！')
    expect(records[1].text).toEqual(['你好！'])
    expect(records.flatMap((record) => record.text).join('')).toBe(answer)
    expect(records.map((record) => record.decoded).join('')).toContain('data: [DONE]')
  })

  it('records EOF separately without manufacturing another byte arrival', async () => {
    vi.useFakeTimers()
    const { records, answer, outcome } = await inspect('truncated')
    expect(outcome.kind).toBe('truncated')
    expect(answer).toContain('你好！')
    expect(records.at(-1)).toMatchObject({ eof: true, bytes: [], text: [], events: [] })
    expect(records.filter((record) => !record.eof)).toHaveLength(4)
  })
})
