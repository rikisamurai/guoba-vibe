import { useEffect, useLayoutEffect, useRef, useState } from 'react'

import type { LiveCapability } from '../../api/live-config'
import { outcomeLabel, type AssistantChatEntry } from '../live/chat-model'
import { useLiveChat } from '../live/use-live-chat'
import { LiveChatComposer } from './live-chat-composer'
import { LiveChatRunCard } from './live-chat-run-card'

interface LiveChatPanelProps {
  capability: LiveCapability
  onRunChange?: (run: AssistantChatEntry | null) => void
}

function emptyCopy(capability: LiveCapability): string {
  if (capability.kind === 'disabled') return 'Live API 当前关闭。本地显式启用后才能发送请求。'
  if (capability.kind === 'missing_key') return '本地服务缺少 DeepSeek Key，浏览器不会接触密钥。'
  return '发送一个问题，观察真实 bytes 如何变成 reasoning、answer 与 React commits。'
}

export function LiveChatPanel({ capability, onRunChange }: LiveChatPanelProps) {
  const chat = useLiveChat()
  const [draft, setDraft] = useState('')
  const transcriptRef = useRef<HTMLDivElement | null>(null)
  const followTailRef = useRef(true)

  useEffect(() => onRunChange?.(chat.selectedRun), [chat.selectedRun, onRunChange])
  useLayoutEffect(() => {
    const transcript = transcriptRef.current
    if (transcript && followTailRef.current) transcript.scrollTop = transcript.scrollHeight
  }, [chat.entries.length, chat.selectedRun?.snapshot.revision])

  const lastAssistantId = chat.entries.findLast((entry) => entry.role === 'assistant')?.id
  const lifecycleStage = chat.selectedRun?.lifecycle.at(-1)?.stage ?? 'idle'
  const announcement = chat.selectedRun?.result
    ? `生成结束：${outcomeLabel(chat.selectedRun.result.outcome)}`
    : chat.running
      ? `生成中：${chat.selectedRun?.snapshot.phase ?? 'connecting'}`
      : ''
  return (
    <section className="chat-surface" aria-label="DeepSeek 真实聊天">
      <div className="chat-surface__bar">
        <span>
          <i /> DEEPSEEK LIVE
        </span>
        <span>
          {chat.protocol} · {lifecycleStage}
        </span>
      </div>
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>
      <div
        className="chat-transcript"
        aria-live="off"
        ref={transcriptRef}
        onScroll={(event) => {
          const node = event.currentTarget
          followTailRef.current = node.scrollHeight - node.scrollTop - node.clientHeight < 80
        }}
      >
        {chat.entries.length === 0 ? <p className="chat-empty">{emptyCopy(capability)}</p> : null}
        {chat.entries.map((entry) =>
          entry.role === 'user' ? (
            <article className="chat-user" key={entry.id}>
              <small>YOU</small>
              <p>{entry.content}</p>
            </article>
          ) : (
            <LiveChatRunCard
              key={entry.id}
              entry={entry}
              canRetry={!chat.running && entry.id === lastAssistantId}
              onRetry={() => chat.retry(entry.id)}
            />
          ),
        )}
      </div>
      <LiveChatComposer
        capability={capability}
        draft={draft}
        protocol={chat.protocol}
        running={chat.running}
        onDraftChange={setDraft}
        onProtocolChange={chat.setProtocol}
        onStop={chat.stop}
        onSubmit={() => {
          if (capability.kind !== 'enabled') return
          chat.send(draft)
          setDraft('')
        }}
      />
    </section>
  )
}
