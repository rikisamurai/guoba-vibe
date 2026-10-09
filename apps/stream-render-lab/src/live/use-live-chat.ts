import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { DEFAULT_MODEL } from '../../api/capability-data'
import { BrowserClock } from '../engine/clock'
import { createStreamingRenderEngine } from '../engine/create-engine'
import type { RenderRun } from '../engine/types'
import type { WireProtocol } from '../protocol'
import {
  appendLifecycle,
  historyFrom,
  type AssistantChatEntry,
  type ChatEntry,
  type LiveStage,
} from './chat-model'
import { DeepSeekSource, type LiveSourceObservation } from './deepseek-source'

interface ActiveRun {
  id: string
  run: RenderRun
  unsubscribe: () => void
}

interface UseLiveChatResult {
  entries: readonly ChatEntry[]
  selectedRun: AssistantChatEntry | null
  protocol: WireProtocol
  running: boolean
  setProtocol: (protocol: WireProtocol) => void
  send: (content: string) => void
  stop: () => void
  retry: (id: string) => void
}

function updateAssistant(
  entries: readonly ChatEntry[],
  id: string,
  update: (entry: AssistantChatEntry) => AssistantChatEntry,
): ChatEntry[] {
  return entries.map((entry) =>
    entry.role === 'assistant' && entry.id === id ? update(entry) : entry,
  )
}

export function useLiveChat(): UseLiveChatResult {
  const clock = useMemo(() => new BrowserClock(), [])
  const engine = useMemo(() => createStreamingRenderEngine({ clock }), [clock])
  const activeRef = useRef<ActiveRun | null>(null)
  const nextIdRef = useRef(0)
  const [entries, setEntries] = useState<ChatEntry[]>([])
  const [protocol, setProtocolState] = useState<WireProtocol>('responses')
  const [running, setRunning] = useState(false)

  const patchRun = useCallback(
    (id: string, update: (entry: AssistantChatEntry) => AssistantChatEntry) => {
      setEntries((current) => updateAssistant(current, id, update))
    },
    [],
  )

  const start = useCallback(
    (base: readonly ChatEntry[], selectedProtocol: WireProtocol) => {
      nextIdRef.current += 1
      const id = `assistant-${nextIdRef.current}`
      const startedAt = clock.now()
      const mark = (stage: LiveStage, detail: string) => {
        patchRun(id, (entry) => ({
          ...entry,
          lifecycle: appendLifecycle(entry.lifecycle, {
            stage,
            detail,
            atMs: clock.now() - startedAt,
          }),
        }))
      }
      const observe = (observation: LiveSourceObservation) => {
        mark(observation.stage, observation.detail)
      }
      const source = new DeepSeekSource({
        protocol: selectedProtocol,
        model: DEFAULT_MODEL,
        messages: historyFrom(base),
        onObservation: observe,
      })
      const run = engine.start({
        source,
        profile: 'production',
        reveal: 'direct',
        trace: 'full',
      })
      const snapshot = run.state.getSnapshot()
      const entry: AssistantChatEntry = {
        id,
        role: 'assistant',
        model: DEFAULT_MODEL,
        protocol: selectedProtocol,
        startedAt,
        lifecycle: [{ stage: 'connecting', atMs: 0, detail: 'POST /api/chat' }],
        snapshot,
        inspection: run.inspect(),
      }
      setEntries([...base, entry])
      setRunning(true)
      const sync = () => {
        const next = run.state.getSnapshot()
        patchRun(id, (current) => ({ ...current, snapshot: next, inspection: run.inspect() }))
        if (next.phase === 'draining') mark('draining', 'visible cursor is catching raw')
      }
      const unsubscribe = run.state.subscribe(sync)
      activeRef.current = { id, run, unsubscribe }
      void run.settled.then((result) => {
        patchRun(id, (current) => ({
          ...current,
          result,
          snapshot: result.snapshot,
          inspection: run.inspect(),
          lifecycle: appendLifecycle(current.lifecycle, {
            stage: 'settled',
            detail: result.outcome.kind,
            atMs: clock.now() - startedAt,
          }),
        }))
        if (activeRef.current?.run === run) {
          activeRef.current.unsubscribe()
          activeRef.current = null
          setRunning(false)
        }
      })
    },
    [clock, engine, patchRun],
  )

  const send = useCallback(
    (content: string) => {
      if (activeRef.current !== null) return
      const trimmed = content.trim()
      if (trimmed === '') return
      nextIdRef.current += 1
      const user: ChatEntry = { id: `user-${nextIdRef.current}`, role: 'user', content: trimmed }
      start([...entries, user], protocol)
    },
    [entries, protocol, start],
  )

  const retry = useCallback(
    (id: string) => {
      if (activeRef.current !== null) return
      const index = entries.findIndex((entry) => entry.id === id && entry.role === 'assistant')
      const failed = entries[index]
      if (index < 1 || failed?.role !== 'assistant') return
      setProtocolState(failed.protocol)
      start(entries.slice(0, index), failed.protocol)
    },
    [entries, start],
  )

  useEffect(
    () => () => {
      const active = activeRef.current
      active?.unsubscribe()
      active?.run.cancel('component unmounted')
    },
    [],
  )

  const selectedRun = entries.findLast(
    (entry): entry is AssistantChatEntry => entry.role === 'assistant',
  )
  return {
    entries,
    selectedRun: selectedRun ?? null,
    protocol,
    running,
    setProtocol: (next) => {
      if (!running) setProtocolState(next)
    },
    send,
    stop: () => activeRef.current?.run.cancel('user pressed stop'),
    retry,
  }
}
