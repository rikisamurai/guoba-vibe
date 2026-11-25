import { describe, expect, it } from 'vitest'

import { practiceChecks, runAcceptance } from './checks'
import { consumeResponse } from './consume-response'
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
  it('requires the final snapshot before the next frame', async () => {
    const reference = implementations.reference
    const result = await runAcceptance(
      {
        ...reference,
        createPublisher: (show, clock) => ({
          ...reference.createPublisher(show, clock),
          finish() {},
        }),
      },
      'batch',
    )
    expect(result.find((check) => check.id === 'batch-final')?.passed).toBe(false)
  })

  it('finishes the abort check when the learner never emits text', async () => {
    const reference = implementations.reference
    const result = await runAcceptance(
      {
        ...reference,
        readAnswer: (response, options) =>
          reference.readAnswer(response, { ...options, onText() {} }),
      },
      'lifecycle',
    )
    expect(result.find((check) => check.id === 'lifecycle-abort')?.passed).toBe(false)
    expect(result.at(-1)?.id).toBe('lifecycle-http')
  })

  it('mine reader is independently observable and runs the basic complete response', async () => {
    const check = practiceChecks.find((item) => item.id === 'lifecycle-complete')!
    expect(await check.run(implementations.mine)).toEqual(check.expected)
  })
  it('retains observed bytes when decoding the current read fails', async () => {
    const records: ReadRecord[] = []
    const strict = new TextDecoder('utf-8', { fatal: true })
    await expect(
      consumeResponse(
        fixtureResponse([Uint8Array.of(0xe4)]),
        {
          signal: new AbortController().signal,
          onText() {},
          onRecord: (record) => records.push(record),
        },
        {
          ...implementations.reference,
          createDecoder: () => ({ push: (bytes) => strict.decode(bytes), finish: () => '' }),
        },
      ),
    ).rejects.toThrow()
    expect(records).toMatchObject([{ bytes: [0xe4], decoded: '', events: [], text: [] }])
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
