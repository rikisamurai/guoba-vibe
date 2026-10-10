import { PROTOCOL_CAPABILITIES } from '../../api/capability-data'
import type { WireProtocol } from '../protocol'

interface LiveChatComposerProps {
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

export function LiveChatComposer({
  draft,
  protocol,
  running,
  onDraftChange,
  onProtocolChange,
  onStop,
  onSubmit,
}: LiveChatComposerProps) {
  return (
    <form
      className="chat-composer"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <label htmlFor="live-protocol">Wire protocol</label>
      <select
        id="live-protocol"
        value={protocol}
        onChange={(event) => {
          if (isProtocol(event.currentTarget.value)) onProtocolChange(event.currentTarget.value)
        }}
      >
        {PROTOCOL_CAPABILITIES.map((item) => (
          <option key={item.id} value={item.id}>
            {item.label}
          </option>
        ))}
      </select>
      <label htmlFor="live-prompt">输入实验问题</label>
      <input
        id="live-prompt"
        value={draft}
        onChange={(event) => onDraftChange(event.currentTarget.value)}
        placeholder="比较 arrival clock 与 display clock…"
      />
      {running ? (
        <button type="button" onClick={onStop}>
          停止
        </button>
      ) : (
        <button type="submit" disabled={draft.trim() === ''}>
          发送
        </button>
      )}
    </form>
  )
}
