import { expect, test } from 'vitest'

import { parseChatRequest } from './chat-schema'

const valid = {
  provider: 'deepseek',
  model: 'deepseek-v4-flash',
  messages: [{ role: 'user', content: 'hi' }],
}

test('accepts a valid request', () => {
  const result = parseChatRequest(valid)
  expect(result.ok).toBe(true)
  if (result.ok) expect(result.value.messages).toHaveLength(1)
})

test('rejects non-object bodies', () => {
  expect(parseChatRequest('x').ok).toBe(false)
  expect(parseChatRequest(null).ok).toBe(false)
})

test('rejects missing provider or model', () => {
  expect(parseChatRequest({ ...valid, provider: '' }).ok).toBe(false)
  expect(parseChatRequest({ ...valid, model: undefined }).ok).toBe(false)
})

test('rejects empty or oversized message lists', () => {
  expect(parseChatRequest({ ...valid, messages: [] }).ok).toBe(false)
  const many = Array.from({ length: 41 }, () => ({ role: 'user', content: 'x' }))
  expect(parseChatRequest({ ...valid, messages: many }).ok).toBe(false)
})

test('rejects bad roles and empty content', () => {
  expect(parseChatRequest({ ...valid, messages: [{ role: 'tool', content: 'x' }] }).ok).toBe(false)
  expect(parseChatRequest({ ...valid, messages: [{ role: 'user', content: '' }] }).ok).toBe(false)
  expect(parseChatRequest({ ...valid, messages: [{ role: 'user' }] }).ok).toBe(false)
})

test('rejects oversized content', () => {
  const long = 'a'.repeat(32_001)
  expect(parseChatRequest({ ...valid, messages: [{ role: 'user', content: long }] }).ok).toBe(false)
})
