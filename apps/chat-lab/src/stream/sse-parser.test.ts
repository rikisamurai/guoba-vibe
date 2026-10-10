import { expect, test } from 'vitest'

import { createSseParser } from './sse-parser'

const encode = (text: string) => new TextEncoder().encode(text)

test('parses multiple events arriving in one chunk', () => {
  const parser = createSseParser()
  const events = parser.push(encode('data: {"a":1}\n\ndata: {"b":2}\n\n'))
  expect(events.map((event) => event.data)).toEqual(['{"a":1}', '{"b":2}'])
})

test('buffers an event split across chunks', () => {
  const parser = createSseParser()
  expect(parser.push(encode('data: {"a"'))).toEqual([])
  expect(parser.push(encode(':1}\n'))).toEqual([])
  expect(parser.push(encode('\n'))).toEqual([{ data: '{"a":1}' }])
})

test('handles CRLF line endings', () => {
  const parser = createSseParser()
  const events = parser.push(encode('data: hello\r\n\r\n'))
  expect(events).toEqual([{ data: 'hello' }])
})

test('accepts data: without a space', () => {
  const parser = createSseParser()
  expect(parser.push(encode('data:x\n\n'))).toEqual([{ data: 'x' }])
})

test('ignores comment lines and unknown fields', () => {
  const parser = createSseParser()
  const events = parser.push(encode(': keepalive\nevent: message\ndata: y\n\n'))
  expect(events).toEqual([{ data: 'y' }])
})

test('joins multi-line data fields with newline', () => {
  const parser = createSseParser()
  const events = parser.push(encode('data: line1\ndata: line2\n\n'))
  expect(events).toEqual([{ data: 'line1\nline2' }])
})

test('passes [DONE] through as data', () => {
  const parser = createSseParser()
  expect(parser.push(encode('data: [DONE]\n\n'))).toEqual([{ data: '[DONE]' }])
})

test('reassembles UTF-8 multi-byte characters split across chunks', () => {
  const parser = createSseParser()
  const bytes = encode('data: 你好👋\n\n')
  const mid = 9 // inside the first CJK character
  const first = parser.push(bytes.subarray(0, mid))
  const second = parser.push(bytes.subarray(mid))
  expect([...first, ...second]).toEqual([{ data: '你好👋' }])
})

test('flush emits an unterminated trailing event', () => {
  const parser = createSseParser()
  expect(parser.push(encode('data: tail'))).toEqual([])
  expect(parser.flush()).toEqual([{ data: 'tail' }])
})

test('flush is a no-op after clean termination', () => {
  const parser = createSseParser()
  parser.push(encode('data: x\n\n'))
  expect(parser.flush()).toEqual([])
})
