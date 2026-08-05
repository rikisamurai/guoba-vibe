import { useCallback, useRef } from 'react'

import { createScheduler } from '../engine/scheduler'
import { runStream } from '../engine/stream-run'
import { getCorpus } from '../sim/corpus'
import { planChunks } from '../sim/profiles'
import { createSimSource } from '../sim/sim-source'
import { addUserMessage, applyFrame, chatStore, startAssistantMessage } from '../store/chat-store'
import { settingsStore } from '../store/settings-store'
import type { TokenSource } from '../types/stream'

let runSeed = 0

function buildSource(): { source: TokenSource; label: string } {
  const settings = settingsStore.get()
  runSeed += 1
  const corpus = getCorpus(settings.corpusId)
  const plan = planChunks(corpus.text, settings.profileId, runSeed)
  return {
    source: createSimSource(plan, settings.speed),
    label: `sim/${settings.profileId}`,
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
    const { source, label } = buildSource()
    const id = startAssistantMessage(settings.mode, label)
    const scheduler = createScheduler(
      {
        policy: settings.mode === 'M0' ? 'immediate' : 'throttled',
        throttleMs: settings.throttleMs,
      },
      (frame) => applyFrame(id, frame),
    )
    activeSource.current = source
    void runStream(source, scheduler).finally(() => {
      if (activeSource.current === source) activeSource.current = null
    })
  }, [])

  const stop = useCallback(() => {
    activeSource.current?.abort()
  }, [])

  return { send, stop }
}
