import { expect, test } from 'vitest'

import { parseOpenAiData } from './openai-stream'

test('extracts delta content', () => {
  const data = JSON.stringify({ choices: [{ delta: { content: 'Hello' } }] })
  expect(parseOpenAiData(data)).toEqual({ type: 'delta', text: 'Hello' })
})

test('skips empty delta content', () => {
  const data = JSON.stringify({ choices: [{ delta: { content: '' } }] })
  expect(parseOpenAiData(data)).toBeNull()
})

test('ignores unknown delta fields like reasoning_content', () => {
  const data = JSON.stringify({ choices: [{ delta: { reasoning_content: 'thinking…' } }] })
  expect(parseOpenAiData(data)).toBeNull()
})

test('maps finish_reason to done', () => {
  const data = JSON.stringify({ choices: [{ delta: {}, finish_reason: 'stop' }] })
  expect(parseOpenAiData(data)).toEqual({ type: 'done', finishReason: 'stop' })
})

test('maps [DONE] sentinel to done', () => {
  expect(parseOpenAiData('[DONE]')).toEqual({ type: 'done' })
})

test('maps upstream error payloads to error', () => {
  const data = JSON.stringify({ error: { message: 'rate limited' } })
  expect(parseOpenAiData(data)).toEqual({ type: 'error', message: 'rate limited' })
})

test('survives malformed JSON', () => {
  expect(parseOpenAiData('{oops')).toBeNull()
})

test('survives non-object payloads and empty choices', () => {
  expect(parseOpenAiData('42')).toBeNull()
  expect(parseOpenAiData(JSON.stringify({ choices: [] }))).toBeNull()
})
