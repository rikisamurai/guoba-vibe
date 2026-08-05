import { cx } from '../../lib/cx'
import type { ChatMessage } from '../../types/message'
import { MessageBody } from '../renderers/message-body'

const PHASE_STYLES: Record<string, string> = {
  streaming: 'bg-pulse/12 text-pulse',
  draining: 'bg-pulse/12 text-pulse',
  final: 'bg-panel-2 text-faint',
  cancelled: 'bg-amber-400/10 text-amber-300',
  error: 'bg-red-400/10 text-red-400',
}

export function MessageItem({ message }: { message: ChatMessage }) {
  if (message.role === 'user') {
    return (
      <div className="border-seam bg-panel-2 max-w-[78%] self-end rounded-[14px] rounded-br-[4px] border px-4 py-3 text-[14.5px] leading-relaxed whitespace-pre-wrap">
        {message.text}
      </div>
    )
  }
  const streaming = message.phase === 'streaming' || message.phase === 'draining'
  return (
    <div className="animate-fade-in">
      <div className="text-faint mb-2.5 flex items-center gap-2.5 font-mono text-[10.5px] tracking-[0.1em] uppercase">
        <span
          className={cx('rounded px-1.5 py-0.5 tracking-[0.08em]', PHASE_STYLES[message.phase])}
        >
          {message.phase}
        </span>
        {message.mode === undefined ? null : <span>{message.mode}</span>}
        {message.sourceLabel === undefined ? null : <span>{message.sourceLabel}</span>}
        <span>commit #{message.commitIndex}</span>
      </div>
      <div className={cx(streaming && 'streaming-tail')}>
        <MessageBody message={message} />
      </div>
      {message.error === undefined ? null : (
        <div className="mt-2 rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-[12.5px] text-red-300">
          {message.error}
        </div>
      )}
    </div>
  )
}
