import { describe, expect, test } from 'vitest'

import { CORPORA } from './corpus'
import { PROFILE_IDS, planChunks } from './profiles'

function reassemble(plan: ReturnType<typeof planChunks>): string {
  const total = plan.reduce((sum, chunk) => sum + chunk.bytes.length, 0)
  const merged = new Uint8Array(total)
  let offset = 0
  for (const chunk of plan) {
    merged.set(chunk.bytes, offset)
    offset += chunk.bytes.length
  }
  return new TextDecoder().decode(merged)
}

describe('lossless partition invariant', () => {
  for (const profile of PROFILE_IDS) {
    for (const corpus of CORPORA) {
      test(`${profile} × ${corpus.id} reassembles to the original text`, () => {
        const plan = planChunks(corpus.text, profile, 42)
        expect(reassemble(plan)).toBe(corpus.text)
        expect(plan.every((chunk) => chunk.bytes.length > 0)).toBe(true)
      })
    }
  }
})

test('same seed produces the same plan, different seed differs', () => {
  const text = CORPORA[0].text
  const a = planChunks(text, 'jitter', 7)
  const b = planChunks(text, 'jitter', 7)
  const c = planChunks(text, 'jitter', 8)
  expect(a.map((chunk) => chunk.bytes.length)).toEqual(b.map((chunk) => chunk.bytes.length))
  expect(a.map((chunk) => chunk.delayMs)).toEqual(b.map((chunk) => chunk.delayMs))
  expect(a.map((chunk) => chunk.bytes.length)).not.toEqual(c.map((chunk) => chunk.bytes.length))
})

test('jitter delays stay within the documented range', () => {
  const plan = planChunks(CORPORA[0].text, 'jitter', 1)
  expect(plan.every((chunk) => chunk.delayMs >= 10 && chunk.delayMs <= 300)).toBe(true)
})

test('burst produces large chunks with long pauses', () => {
  const plan = planChunks(CORPORA[1].text, 'burst', 1)
  expect(plan.every((chunk) => chunk.delayMs >= 500)).toBe(true)
  expect(Math.max(...plan.map((chunk) => chunk.bytes.length))).toBeGreaterThan(500)
})

test('boundary cuts land inside ** markers', () => {
  const text = 'plain text then **a bold span** and more'
  const plan = planChunks(text, 'boundary', 3)
  const lengths = plan.map((chunk) => chunk.bytes.length)
  // the cut inside ** means some chunk ends exactly after a single asterisk
  const decoder = new TextDecoder()
  const prefixes: string[] = []
  let acc = ''
  for (const chunk of plan) {
    acc += decoder.decode(chunk.bytes, { stream: true })
    prefixes.push(acc)
  }
  expect(prefixes.some((prefix) => /(^|[^*])\*$/.test(prefix))).toBe(true)
  expect(lengths.every((length) => length > 0)).toBe(true)
})

test('boundary cuts land inside multi-byte characters', () => {
  const text = '中文内容开始 **加粗** 结束'
  const plan = planChunks(text, 'boundary', 3)
  // at least one chunk must end mid-codepoint: its last byte is a UTF-8 lead byte
  // (>= 0xc0) or a continuation follows in the next chunk's first byte (0x80-0xbf)
  const midCut = plan.some(
    (chunk, index) =>
      index < plan.length - 1 &&
      plan[index + 1].bytes[0] >= 0x80 &&
      plan[index + 1].bytes[0] < 0xc0,
  )
  expect(midCut).toBe(true)
})
