import { useEffect, useState } from 'react'

import type { LiveCapability } from '../../api/live-config'
import { LiveChatInspector } from '../components/live-chat-inspector'
import { LiveChatPanel } from '../components/live-chat-panel'
import type { AssistantChatEntry } from '../live/chat-model'

interface CapabilityResponse {
  capability: LiveCapability
}

const DISABLED: LiveCapability = { kind: 'disabled' }

function parseCapabilityResponse(value: unknown): CapabilityResponse {
  if (typeof value !== 'object' || value === null || !('capability' in value)) {
    throw new TypeError('invalid capability response')
  }
  const capability = value.capability
  if (
    typeof capability !== 'object' ||
    capability === null ||
    !('kind' in capability) ||
    (capability.kind !== 'enabled' &&
      capability.kind !== 'disabled' &&
      capability.kind !== 'missing_key')
  ) {
    throw new TypeError('invalid live capability')
  }
  return { capability: { kind: capability.kind } }
}

function statusLabel(capability: LiveCapability | null): string {
  if (!capability) return 'CHECKING'
  if (capability.kind === 'enabled') return 'LIVE ENABLED'
  if (capability.kind === 'missing_key') return 'MISSING KEY'
  return 'LIVE DISABLED'
}

function statusNote(capability: LiveCapability | null): string {
  if (!capability) return 'checking local server capability'
  if (capability.kind === 'enabled') return 'server-side key · byte passthrough'
  if (capability.kind === 'missing_key') return 'set DEEPSEEK_API_KEY locally'
  return 'set ENABLE_LIVE_API=1 locally'
}

export default function ChatPage() {
  const [capability, setCapability] = useState<LiveCapability | null>(null)
  const [selectedRun, setSelectedRun] = useState<AssistantChatEntry | null>(null)
  useEffect(() => {
    void fetch('/api/capabilities', { headers: { accept: 'application/json' } })
      .then(async (response) => {
        if (!response.ok) throw new Error(`capabilities ${response.status}`)
        const value: unknown = await response.json()
        return parseCapabilityResponse(value)
      })
      .then((response) => setCapability(response.capability))
      .catch(() => setCapability(DISABLED))
  }, [])
  return (
    <div className="chat-page">
      <header className="chat-page__intro">
        <span>
          <small>DEEPSEEK LIVE</small>
          <h1>真实回答，也能逐层观察</h1>
          <p>同一条生产渲染管线，分离 reasoning、answer、协议终态与 React commit。</p>
        </span>
        <aside className={`chat-capability chat-capability--${capability?.kind ?? 'checking'}`}>
          <strong>{statusLabel(capability)}</strong>
          <small>{statusNote(capability)}</small>
        </aside>
      </header>
      <div className="chat-workspace">
        <LiveChatPanel capability={capability ?? DISABLED} onRunChange={setSelectedRun} />
        <LiveChatInspector run={selectedRun} />
      </div>
    </div>
  )
}
