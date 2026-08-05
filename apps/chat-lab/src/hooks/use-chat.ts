import { useCallback, useRef } from 'react'

import { metrics } from '../engine/metrics'
import { createScheduler } from '../engine/scheduler'
import { runStream } from '../engine/stream-run'
import { getCorpus } from '../sim/corpus'
import { planChunks } from '../sim/profiles'
import { createSimSource } from '../sim/sim-source'
import { addUserMessage, applyFrame, chatStore, startAssistantMessage } from '../store/chat-store'
import { settingsStore } from '../store/settings-store'
import { createChatSource } from '../stream/chat-source'
import { isTerminal } from '../types/message'
import type { TokenSource } from '../types/stream'

let runSeed = 0
const HISTORY_LIMIT = 20

function buildSimSource(): { source: TokenSource; label: string } {
  const settings = settingsStore.get()
  runSeed += 1
  const corpus = getCorpus(settings.corpusId)
  const plan = planChunks(corpus.text, settings.profileId, runSeed)
  return {
    source: createSimSource(plan, settings.speed),
    label: `sim/${settings.profileId}`,
  }
}

function buildLiveSource(): { source: TokenSource; label: string } {
  const settings = settingsStore.get()
  const history = chatStore
    .get()
    .messages.filter((message) => isTerminal(message.phase) && message.text !== '')
    .slice(-HISTORY_LIMIT)
    .map((message) => ({ role: message.role, content: message.text }))
  return {
    source: createChatSource({
      provider: settings.provider,
      model: settings.model,
      messages: history,
    }),
    label: settings.model,
  }
}

export function useChat(): { send: (text: string) => void; stop: () => void } {
  const activeSource = useRef<TokenSource | null>(null)

  const send = useCallback((text: string) => {
    if (chatStore.get().activeId !== null) return
    const trimmed = text.trim()
    if (trimmed === '') return

    addUserMessage(trimmed)
    const settings = settingsStore.get()
    const { source, label } = settings.source === 'live' ? buildLiveSource() : buildSimSource()
    const id = startAssistantMessage(settings.mode, label)
    metrics.reset(`${settings.mode} · ${label}`)
    const scheduler = createScheduler(
      {
        policy: settings.mode === 'M0' ? 'immediate' : 'throttled',
        throttleMs: settings.throttleMs,
        smoothing: settings.smoothing,
      },
      (frame) => {
        applyFrame(id, frame)
        metrics.onCommit(frame.text.length)
      },
    )
    const instrumented = {
      ...scheduler,
      onDelta(delta: string) {
        metrics.onDelta(delta.length)
        scheduler.onDelta(delta)
      },
    }
    activeSource.current = source
    void runStream(source, instrumented).finally(() => {
      if (activeSource.current === source) activeSource.current = null
    })
  }, [])

  const stop = useCallback(() => {
    activeSource.current?.abort()
  }, [])

  return { send, stop }
}
