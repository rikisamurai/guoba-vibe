import { useState } from 'react'

import type { AssistantChatEntry } from '../live/chat-model'
import { orderedRaw, outcomeLabel, outcomeMessage } from '../live/chat-model'
import { RenderDocumentView } from '../rendering/render-document'

interface LiveChatRunCardProps {
  entry: AssistantChatEntry
  canRetry: boolean
  onRetry: () => void
}

export function LiveChatRunCard({ entry, canRetry, onRetry }: LiveChatRunCardProps) {
  const [copied, setCopied] = useState(false)
  const [reasoningOpen, setReasoningOpen] = useState(true)
  const reasoning = entry.snapshot.parts.find((part) => part.kind === 'reasoning')
  const answer = entry.snapshot.parts.find((part) => part.kind === 'answer')
  const terminalMessage = outcomeMessage(entry.snapshot.outcome)
  const copyText = orderedRaw(entry)
  const final = entry.snapshot.phase === 'settled'
  const status = entry.snapshot.outcome
    ? outcomeLabel(entry.snapshot.outcome)
    : entry.snapshot.phase
  return (
    <article className="chat-run" aria-label={`DeepSeek ${entry.protocol} 回答`}>
      <header className="chat-run__header">
        <span className="chat-run__avatar" aria-hidden="true">
          DS
        </span>
        <span>
          <strong>DeepSeek</strong>
          <small>
            {entry.protocol} · {entry.snapshot.runId}
          </small>
        </span>
        <span
          className={`chat-run__status chat-run__status--${entry.snapshot.outcome?.kind ?? 'live'}`}
        >
          {status}
        </span>
      </header>
      {reasoning ? (
        <details
          className="chat-reasoning"
          open={reasoningOpen}
          onToggle={(event) => setReasoningOpen(event.currentTarget.open)}
        >
          <summary>
            <span>思考过程</span>
            <small>
              {reasoning.raw.length} chars · {reasoning.ended ? '已完成' : '实时生成'}
            </small>
          </summary>
          <RenderDocumentView
            document={reasoning.document}
            final={final}
            heavyArtifacts={entry.snapshot.heavyArtifacts}
            partId={reasoning.id}
            revision={entry.snapshot.revision}
            runId={entry.snapshot.runId}
          />
        </details>
      ) : null}
      <section className="chat-answer" aria-label="模型回答">
        {answer ? (
          <RenderDocumentView
            document={answer.document}
            final={final}
            heavyArtifacts={entry.snapshot.heavyArtifacts}
            partId={answer.id}
            revision={entry.snapshot.revision}
            runId={entry.snapshot.runId}
          />
        ) : (
          <p className="chat-answer__pending">
            {final ? '本次运行没有回答正文。' : '正在等待内容…'}
          </p>
        )}
      </section>
      {terminalMessage ? (
        <div className={`chat-run__notice chat-run__notice--${entry.snapshot.outcome?.kind}`}>
          <strong>{outcomeLabel(entry.snapshot.outcome)}</strong>
          <p>{terminalMessage}</p>
          {entry.snapshot.diagnostics.length > 0 ? (
            <details>
              <summary>查看 diagnostics</summary>
              <ul>
                {entry.snapshot.diagnostics.map((item) => (
                  <li key={`${item.code}-${item.message}`}>
                    {item.code}: {item.message}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      ) : null}
      {final ? (
        <div className="chat-run__actions">
          <button
            type="button"
            disabled={copyText === ''}
            onClick={() => {
              void navigator.clipboard.writeText(copyText).then(() => {
                setCopied(true)
                window.setTimeout(() => setCopied(false), 1200)
              })
            }}
          >
            {copied ? '已复制' : '复制 raw'}
          </button>
          {canRetry ? (
            <button type="button" onClick={onRetry}>
              重试
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}
