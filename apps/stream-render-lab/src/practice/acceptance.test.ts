import { describe, expect, it } from 'vitest'

import { practiceChecks, runAcceptance } from './checks'
import { implementations } from './implementations'
import { fixtureResponse, teachingPacket } from './lifecycle-checks'
import type { ReadRecord } from './types'

describe('shared learner/reference acceptance contract', () => {
  it('reference passes every check', async () => {
    const result = await runAcceptance(implementations.reference)
    expect(result.filter((item) => !item.passed)).toEqual([])
    expect(result).toHaveLength(practiceChecks.length)
  })
  it('does not silently substitute reference code for a broken learner implementation', async () => {
    const broken = {
      ...implementations.reference,
      createDecoder: () => ({ push: () => '', finish: () => '' }),
    }
    const result = await runAcceptance(broken, 'utf8')
    expect(result.every((item) => !item.passed)).toBe(true)
  })
  it('mine reader is independently observable and runs the basic complete response', async () => {
    const check = practiceChecks.find((item) => item.id === 'lifecycle-complete')!
    expect(await check.run(implementations.mine)).toEqual(check.expected)
  })
  it('records observed bytes, emitted text, SSE data and accepted deltas in the same read', async () => {
    const bytes = new TextEncoder().encode(teachingPacket + 'data: [DONE]\n\n')
    const records: ReadRecord[] = []
    await implementations.reference.readAnswer(
      fixtureResponse([bytes.slice(0, 10), bytes.slice(10)]),
      {
        signal: new AbortController().signal,
        onText() {},
        onRecord: (record) => records.push(record),
      },
    )
    expect(records.map((item) => item.bytes.length)).toEqual([10, bytes.length - 10])
    expect(records[0].events).toEqual([])
    expect(records[1].text).toEqual(['你好'])
    expect(records[1].events).toHaveLength(2)
  })
})
