import type { CommitFrame } from '../engine/scheduler'
import type { ChatMessage, MessagePhase, RendererMode } from '../types/message'
import { createStore, useStore } from './create-store'

export interface ChatState {
  messages: ChatMessage[]
  /** id of the assistant message currently being streamed, if any. */
  activeId: string | null
}

export const chatStore = createStore<ChatState>({ messages: [], activeId: null })

let nextId = 0
function makeId(prefix: string): string {
  nextId += 1
  return `${prefix}-${nextId}`
}

export function addUserMessage(text: string): void {
  const message: ChatMessage = {
    id: makeId('u'),
    role: 'user',
    text,
    phase: 'final',
    commitIndex: 0,
  }
  chatStore.set((state) => ({ ...state, messages: [...state.messages, message] }))
}

export function startAssistantMessage(mode: RendererMode, sourceLabel: string): string {
  const id = makeId('a')
  const message: ChatMessage = {
    id,
    role: 'assistant',
    text: '',
    phase: 'streaming',
    commitIndex: 0,
    mode,
    sourceLabel,
  }
  chatStore.set((state) => ({
    ...state,
    messages: [...state.messages, message],
    activeId: id,
  }))
  return id
}

export function applyFrame(id: string, frame: CommitFrame): void {
  chatStore.set((state) => {
    const messages = state.messages.map((message) =>
      message.id === id
        ? {
            ...message,
            text: frame.text,
            phase: frame.phase,
            commitIndex: frame.commitIndex,
            ...(frame.error === undefined ? {} : { error: frame.error }),
          }
        : message,
    )
    const stillActive = state.activeId === id && frame.phase === 'streaming'
    return { ...state, messages, activeId: stillActive ? id : null }
  })
}

/** Drop the last assistant message (used by regenerate). */
export function truncateAfterLastUser(): void {
  chatStore.set((state) => {
    const lastUser = state.messages.findLastIndex((message) => message.role === 'user')
    if (lastUser === -1) return state
    return { ...state, messages: state.messages.slice(0, lastUser + 1) }
  })
}

export function resetChat(): void {
  chatStore.set(() => ({ messages: [], activeId: null }))
}

export function useChatMessages(): ChatMessage[] {
  return useStore(chatStore, (state) => state.messages)
}

export function useActivePhase(): MessagePhase | null {
  return useStore(chatStore, (state) => {
    if (state.activeId === null) return null
    return state.messages.find((message) => message.id === state.activeId)?.phase ?? null
  })
}

export function useIsStreaming(): boolean {
  return useStore(chatStore, (state) => state.activeId !== null)
}
