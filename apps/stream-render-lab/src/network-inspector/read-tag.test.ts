import { describe, expect, it } from 'vitest'

import { readTag } from './read-tag'

const record = (input: string | number[], events: string[] = [], text: string[] = []) => ({
  index: 0,
  bytes: typeof input === 'string' ? [...new TextEncoder().encode(input)] : input,
  decoded: '',
  events,
  text,
})

describe('readTag', () => {
  it('marks both halves of a split UTF-8 character', () => {
    const bytes = [...new TextEncoder().encode('data: 你好\n\n')]
    expect(readTag(record(bytes.slice(0, 7)))).toBe('字符被切开')
    expect(readTag(record(bytes.slice(7), ['你好'], ['你好']))).toBe('字符被切开')
  })

  it('uses the dispatched event when the terminating blank line arrives in a later read', () => {
    expect(readTag(record('data: hello\n'))).toBe('未派发事件')
    expect(readTag(record('\n', ['hello'], ['hello']))).toBeNull()
  })

  it('distinguishes a comment from a dispatched event without answer text', () => {
    expect(readTag(record(': heartbeat\n\n'))).toBe('未派发事件')
    expect(readTag(record('data: [DONE]\r\n\r\n', ['[DONE]']))).toBe('无正文')
  })

  it('leaves a read that emits text and begins the next event unmarked', () => {
    expect(readTag(record('data: hello\n\ndata: wo', ['hello'], ['hello']))).toBeNull()
    expect(readTag({ ...record([]), eof: true })).toBeNull()
  })
})
