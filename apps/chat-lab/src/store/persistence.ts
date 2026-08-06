import type { ChatMessage, MessagePhase } from '../types/message'
import { chatStore, hydrateChat } from './chat-store'

/**
 * Session persistence: write only when no run is active (never per commit),
 * version the payload, and fall back to an empty session on anything broken.
 * Messages persisted mid-stream are downgraded to cancelled on load.
 */
const SESSION_KEY = 'chat-lab:session:v1'
const MAX_STORED_MESSAGES = 40

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

export function serializeSession(messages: ChatMessage[]): string {
  return JSON.stringify({ version: 1, messages: messages.slice(-MAX_STORED_MESSAGES) })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function reviveMessage(value: unknown): ChatMessage | null {
  if (!isRecord(value)) return null
  const { id, role, text, phase, commitIndex, mode, sourceLabel, error } = value
  if (typeof id !== 'string' || typeof text !== 'string') return null
  if (role !== 'user' && role !== 'assistant') return null
  const revivedPhase: MessagePhase =
    phase === 'final' || phase === 'cancelled' || phase === 'error' ? phase : 'cancelled'
  return {
    id,
    role,
    text,
    phase: revivedPhase,
    commitIndex: typeof commitIndex === 'number' ? commitIndex : 0,
    ...(mode === 'M0' || mode === 'M1' || mode === 'M2' || mode === 'M3' ? { mode } : {}),
    ...(typeof sourceLabel === 'string' ? { sourceLabel } : {}),
    ...(typeof error === 'string' ? { error } : {}),
  }
}

export function deserializeSession(json: string | null): ChatMessage[] | null {
  if (json === null) return null
  let payload: unknown
  try {
    payload = JSON.parse(json)
  } catch {
    return null
  }
  if (!isRecord(payload) || payload.version !== 1 || !Array.isArray(payload.messages)) return null
  const messages: ChatMessage[] = []
  for (const entry of payload.messages) {
    const revived = reviveMessage(entry)
    if (revived === null) return null
    messages.push(revived)
  }
  return messages
}

export function initChatPersistence(storage: StorageLike): void {
  const loaded = deserializeSession(storage.getItem(SESSION_KEY))
  if (loaded !== null && loaded.length > 0) hydrateChat(loaded)
  chatStore.subscribe(() => {
    const state = chatStore.get()
    if (state.activeId !== null) return
    try {
      storage.setItem(SESSION_KEY, serializeSession(state.messages))
    } catch {
      // quota or private mode — persistence is best effort
    }
  })
}
