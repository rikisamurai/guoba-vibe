import { beforeEach, expect, test } from 'vitest'

import {
  addUserMessage,
  applyFrame,
  chatStore,
  resetChat,
  startAssistantMessage,
  truncateAfterLastUser,
} from './chat-store'

beforeEach(() => {
  resetChat()
})

test('addUserMessage appends a final user message', () => {
  addUserMessage('hello')
  const { messages } = chatStore.get()
  expect(messages).toHaveLength(1)
  expect(messages[0]).toMatchObject({ role: 'user', text: 'hello', phase: 'final' })
})

test('startAssistantMessage marks the run active', () => {
  addUserMessage('q')
  const id = startAssistantMessage('M0', 'sim/jitter')
  const state = chatStore.get()
  expect(state.activeId).toBe(id)
  expect(state.messages.at(-1)).toMatchObject({ role: 'assistant', phase: 'streaming', mode: 'M0' })
})

test('applyFrame updates text and releases active on terminal phases', () => {
  addUserMessage('q')
  const id = startAssistantMessage('M0', 'sim/jitter')
  applyFrame(id, { text: 'partial', phase: 'streaming', commitIndex: 1 })
  expect(chatStore.get().activeId).toBe(id)
  applyFrame(id, { text: 'full answer', phase: 'final', commitIndex: 2 })
  const state = chatStore.get()
  expect(state.activeId).toBeNull()
  expect(state.messages.at(-1)).toMatchObject({ text: 'full answer', phase: 'final' })
})

test('applyFrame carries error details', () => {
  const id = startAssistantMessage('M0', 'sim/jitter')
  applyFrame(id, { text: 'oops', phase: 'error', commitIndex: 1, error: 'boom' })
  expect(chatStore.get().messages.at(-1)).toMatchObject({ phase: 'error', error: 'boom' })
})

test('truncateAfterLastUser drops trailing assistant messages', () => {
  addUserMessage('q1')
  const a1 = startAssistantMessage('M0', 'sim')
  applyFrame(a1, { text: 'answer', phase: 'final', commitIndex: 1 })
  truncateAfterLastUser()
  const { messages } = chatStore.get()
  expect(messages).toHaveLength(1)
  expect(messages[0].role).toBe('user')
})
