import { PROTOCOL_CAPABILITIES } from '../../api/capability-data'
import type { LiveCapability } from '../../api/live-config'
import type { WireProtocol } from '../protocol'

interface LiveChatComposerProps {
  capability: LiveCapability
  draft: string
  protocol: WireProtocol
  running: boolean
  onDraftChange: (draft: string) => void
  onProtocolChange: (protocol: WireProtocol) => void
  onStop: () => void
  onSubmit: () => void
}

function isProtocol(value: string): value is WireProtocol {
  return value === 'chat-completions' || value === 'responses' || value === 'anthropic'
}

function disabledReason(capability: LiveCapability): string | null {
  if (capability.kind === 'disabled') return 'Live API 未开启：请在本地设置 ENABLE_LIVE_API=1。'
  if (capability.kind === 'missing_key') return '缺少 DEEPSEEK_API_KEY，密钥仅由本地服务读取。'
  return null
}

export function LiveChatComposer(props: LiveChatComposerProps) {
  const reason = disabledReason(props.capability)
  const cannotSend = reason !== null || props.draft.trim() === ''
  return (
    <form
      className="chat-composer"
      onSubmit={(event) => {
        event.preventDefault()
        if (!cannotSend) props.onSubmit()
      }}
    >
      <div className="chat-composer__controls">
        <label htmlFor="live-protocol">Protocol</label>
        <select
          id="live-protocol"
          value={props.protocol}
          disabled={props.running}
          onChange={(event) => {
            if (isProtocol(event.currentTarget.value)) {
              props.onProtocolChange(event.currentTarget.value)
            }
          }}
        >
          {PROTOCOL_CAPABILITIES.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
        <span>deepseek-v4-flash · production/direct</span>
      </div>
      <label className="sr-only" htmlFor="live-prompt">
        输入实验问题
      </label>
      <textarea
        id="live-prompt"
        value={props.draft}
        aria-describedby={reason ? 'live-disabled-reason' : undefined}
        onChange={(event) => props.onDraftChange(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault()
            if (!cannotSend && !props.running) props.onSubmit()
          }
        }}
        placeholder="询问一个 Streaming Render 问题…"
      />
      <div className="chat-composer__footer">
        <small id="live-disabled-reason">{reason ?? 'Enter 发送 · Shift+Enter 换行'}</small>
        {props.running ? (
          <button className="button button--stop" type="button" onClick={props.onStop}>
            停止生成
          </button>
        ) : (
          <button className="button" type="submit" disabled={cannotSend}>
            发送
          </button>
        )}
      </div>
    </form>
  )
}
