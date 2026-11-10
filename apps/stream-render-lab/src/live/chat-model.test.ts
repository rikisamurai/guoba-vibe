import { describe, expect, it } from 'vitest'

import { RunModel } from '../engine/run-model'
import { historyFrom, type ChatEntry } from './chat-model'

function user(index: number): ChatEntry {
  return { id: `q${index}`, role: 'user', content: `question ${index}` }
}

function assistant(index: number, content = `answer ${index}`): ChatEntry {
  const id = `a${index}`
  const model = new RunModel(id, 'M0')
  model.startPart('answer', 'answer')
  model.appendPart('answer', { kind: 'text', text: content }, 0)
  const snapshot = model.snapshot('settled')
  return {
    id,
    role: 'assistant',
    model: 'fixture',
    protocol: 'anthropic',
    startedAt: 0,
    lifecycle: [],
    snapshot,
    inspection: { snapshot, trace: [] },
  }
}

describe('chat request history', () => {
  it('drops an orphaned assistant when truncating full turns and keeps the latest user', () => {
    const prior = Array.from({ length: 10 }, (_, index) => [user(index), assistant(index)]).flat()
    const history = historyFrom([...prior, user(10)])
    expect(history).toHaveLength(19)
    expect(history[0]).toEqual({ role: 'user', content: 'question 1' })
    expect(history.at(-1)).toEqual({ role: 'user', content: 'question 10' })
  })

  it('does not send an empty answer or lose the user request when retrying', () => {
    expect(historyFrom([user(0), assistant(0, ''), user(1)])).toEqual([
      { role: 'user', content: 'question 0' },
      { role: 'user', content: 'question 1' },
    ])
  })
})
