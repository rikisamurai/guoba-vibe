import { beforeEach, expect, test } from 'vitest'

import type { ChatMessage } from '../types/message'
import { chatStore, resetChat, startAssistantMessage } from './chat-store'
import { deserializeSession, initChatPersistence, serializeSession } from './persistence'

beforeEach(() => {
  resetChat()
})

function fakeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial))
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  }
}

const MESSAGES: ChatMessage[] = [
  { id: 'u-1', role: 'user', text: 'hi', phase: 'final', commitIndex: 0 },
  { id: 'a-2', role: 'assistant', text: 'hello', phase: 'final', commitIndex: 9, mode: 'M2' },
]

test('round-trips a session', () => {
  const revived = deserializeSession(serializeSession(MESSAGES))
  expect(revived).toEqual(MESSAGES)
})

test('bad JSON and wrong versions fall back to null', () => {
  expect(deserializeSession('{oops')).toBeNull()
  expect(deserializeSession(JSON.stringify({ version: 2, messages: [] }))).toBeNull()
  expect(deserializeSession(JSON.stringify({ version: 1, messages: [{ id: 1 }] }))).toBeNull()
  expect(deserializeSession(null)).toBeNull()
})

test('streaming phases are downgraded to cancelled on load', () => {
  const stored = JSON.stringify({
    version: 1,
    messages: [{ id: 'a-1', role: 'assistant', text: 'part', phase: 'streaming', commitIndex: 3 }],
  })
  const revived = deserializeSession(stored)
  expect(revived?.[0].phase).toBe('cancelled')
})

test('stored sessions cap at the most recent 40 messages', () => {
  const many: ChatMessage[] = Array.from({ length: 60 }, (_, index) => ({
    id: `u-${index}`,
    role: 'user',
    text: `${index}`,
    phase: 'final',
    commitIndex: 0,
  }))
  const revived = deserializeSession(serializeSession(many))
  expect(revived).toHaveLength(40)
  expect(revived?.[0].text).toBe('20')
})

test('init hydrates the store and keeps new ids collision-free', () => {
  const storage = fakeStorage({
    'chat-lab:session:v1': serializeSession(MESSAGES),
  })
  initChatPersistence(storage)
  expect(chatStore.get().messages).toHaveLength(2)
  const newId = startAssistantMessage('M0', 'sim')
  expect(MESSAGES.some((message) => message.id === newId)).toBe(false)
})

test('init saves terminal states but never mid-run states', () => {
  const storage = fakeStorage()
  initChatPersistence(storage)
  startAssistantMessage('M0', 'sim') // activeId set → subscriber must skip saving
  expect(storage.data.has('chat-lab:session:v1')).toBe(false)
})
