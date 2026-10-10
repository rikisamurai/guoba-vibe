import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

import { CAPABILITY_VERIFIED_AT, DEFAULT_MODEL } from '../../api/capability-data'
import { BrowserClock } from '../engine/clock'
import { createStreamingRenderEngine } from '../engine/create-engine'
import type { RenderRun, RenderSnapshot, RunResult } from '../engine/types'
import type { HeavyArtifact } from '../heavy/types'
import { DeepSeekSource, type DeepSeekMessage } from '../live/deepseek-source'
import type { RenderDocument } from '../markdown/types'
import type { WireProtocol } from '../protocol'
import { RenderDocumentView } from '../rendering/render-document'
import { LiveChatComposer } from './live-chat-composer'

interface ChatEntry extends DeepSeekMessage {
  id: number
  document?: RenderDocument
  heavyArtifacts?: readonly HeavyArtifact[]
  partId?: string
}

interface LiveChatPanelProps {
  onSnapshot?: (snapshot: RenderSnapshot) => void
}

function outcomeLabel(result: RunResult): string {
  const outcome = result.outcome
  if (outcome.kind === 'failed') return outcome.failure.code ?? outcome.failure.message
  if (outcome.kind === 'truncated') return `truncated:${outcome.cause}`
  if (outcome.kind === 'cancelled') return `cancelled:${outcome.by}`
  return `${outcome.kind}:${outcome.reason}`
}

export function LiveChatPanel({ onSnapshot }: LiveChatPanelProps) {
  const clock = useMemo(() => new BrowserClock(), [])
  const engine = useMemo(() => createStreamingRenderEngine({ clock }), [clock])
  const runRef = useRef<RenderRun | null>(null)
  const unsubscribeRef = useRef<(() => void) | null>(null)
  const nextIdRef = useRef(0)
  const transcriptRef = useRef<HTMLDivElement | null>(null)
  const followTailRef = useRef(true)
  const [entries, setEntries] = useState<ChatEntry[]>([])
  const [snapshot, setSnapshot] = useState<RenderSnapshot | null>(null)
  const [protocol, setProtocol] = useState<WireProtocol>('responses')
  const [draft, setDraft] = useState('')
  const [running, setRunning] = useState(false)
  const [status, setStatus] = useState('local opt-in · not connected')

  useEffect(
    () => () => {
      unsubscribeRef.current?.()
      runRef.current?.cancel('component unmounted')
    },
    [],
  )

  useEffect(() => {
    if (snapshot) onSnapshot?.(snapshot)
  }, [onSnapshot, snapshot])

  useLayoutEffect(() => {
    const transcript = transcriptRef.current
    if (transcript && followTailRef.current) transcript.scrollTop = transcript.scrollHeight
  }, [entries, snapshot?.revision])

  function nextEntry(
    message: DeepSeekMessage,
    document?: RenderDocument,
    heavyArtifacts?: readonly HeavyArtifact[],
    partId?: string,
  ): ChatEntry {
    nextIdRef.current += 1
    return {
      ...message,
      id: nextIdRef.current,
      ...(document ? { document } : {}),
      ...(heavyArtifacts ? { heavyArtifacts } : {}),
      ...(partId ? { partId } : {}),
    }
  }

  function submit(): void {
    const content = draft.trim()
    if (!content || running) return
    const user = nextEntry({ role: 'user', content })
    const messages = [...entries, user].map(({ role, content: text }) => ({ role, content: text }))
    setEntries((current) => [...current, user])
    setDraft('')
    setStatus('connecting')
    setRunning(true)
    const run = engine.start({
      source: new DeepSeekSource({ protocol, model: DEFAULT_MODEL, messages }),
      profile: 'production',
      reveal: 'direct',
      trace: 'summary',
    })
    runRef.current = run
    setSnapshot(run.state.getSnapshot())
    unsubscribeRef.current?.()
    unsubscribeRef.current = run.state.subscribe(() => setSnapshot(run.state.getSnapshot()))
    void run.settled.then((result) => {
      if (runRef.current !== run) return
      const answer = result.snapshot.parts.find((part) => part.kind === 'answer')
      if (answer?.raw) {
        setEntries((current) => [
          ...current,
          nextEntry(
            { role: 'assistant', content: answer.raw },
            answer.document,
            result.snapshot.heavyArtifacts,
            answer.id,
          ),
        ])
      }
      setSnapshot(null)
      setStatus(outcomeLabel(result))
      setRunning(false)
    })
  }

  function stop(): void {
    if (!running) return
    setStatus('stopping')
    runRef.current?.cancel('user pressed stop')
  }

  const answer = snapshot?.parts.find((part) => part.kind === 'answer')
  const reasoning = snapshot?.parts.find((part) => part.kind === 'reasoning')
  return (
    <section className="chat-demo" aria-label="DeepSeek 聊天实验">
      <div className="chat-demo__bar">
        <span>
          <i /> DEEPSEEK · {protocol}
        </span>
        <span>
          <strong>{status}</strong> · matrix {CAPABILITY_VERIFIED_AT}
        </span>
      </div>
      <div
        className="chat-demo__messages"
        aria-live={running ? 'off' : 'polite'}
        onScroll={(event) => {
          const node = event.currentTarget
          followTailRef.current = node.scrollHeight - node.scrollTop - node.clientHeight < 80
        }}
        ref={transcriptRef}
      >
        {entries.length === 0 ? (
          <p>
            公共站点会返回 <code>live_disabled</code>；本地开启后才会发送请求。
          </p>
        ) : null}
        {entries.map((entry) => (
          <article key={entry.id} className={`chat-message chat-message--${entry.role}`}>
            <p className="chat-message__role">{entry.role === 'user' ? 'YOU' : 'ASSISTANT'}</p>
            {entry.document ? (
              <RenderDocumentView
                document={entry.document}
                heavyArtifacts={entry.heavyArtifacts}
                partId={entry.partId}
                runId={`history-${entry.id}`}
              />
            ) : (
              <p>{entry.content}</p>
            )}
          </article>
        ))}
        {reasoning ? (
          <details>
            <summary>Reasoning stream</summary>
            <RenderDocumentView
              document={reasoning.document}
              final={false}
              heavyArtifacts={snapshot?.heavyArtifacts}
              partId={reasoning.id}
              runId={snapshot?.runId}
            />
          </details>
        ) : null}
        {answer ? (
          <article className="chat-message chat-message--assistant">
            <p className="chat-message__role">ASSISTANT · {snapshot?.phase}</p>
            <RenderDocumentView
              document={answer.document}
              final={false}
              heavyArtifacts={snapshot?.heavyArtifacts}
              partId={answer.id}
              revision={snapshot?.revision}
              runId={snapshot?.runId}
            />
          </article>
        ) : null}
      </div>
      <LiveChatComposer
        draft={draft}
        protocol={protocol}
        running={running}
        onDraftChange={setDraft}
        onProtocolChange={setProtocol}
        onStop={stop}
        onSubmit={submit}
      />
    </section>
  )
}
