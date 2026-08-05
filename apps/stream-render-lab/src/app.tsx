import { useState } from 'react'

import { ChatPanel } from './components/chat-panel'
import { LabConsole } from './components/lab-console'
import type { LabMode } from './components/lab-console'
import type { ProviderId } from './lib/chat-types'
import type { RendererId } from './lib/renderers'
import type { ReplayConfig } from './lib/replay-config'
import { useStreamSession } from './lib/use-stream-session'

export function App() {
  const session = useStreamSession()
  const [mode, setMode] = useState<LabMode>('live')
  const [provider, setProvider] = useState<ProviderId>('deepseek')
  const [renderer, setRenderer] = useState<RendererId>('p0')
  const [replayConfig, setReplayConfig] = useState<ReplayConfig>({
    content: 'adversarial',
    wire: 'jitter',
    speed: 1,
  })
  const [consoleOpen, setConsoleOpen] = useState(false)

  return (
    <div className="flex h-dvh flex-col bg-neutral-950 text-neutral-100">
      <header className="flex items-center justify-between border-b border-neutral-800 px-4 py-2.5">
        <h1 className="font-mono text-sm font-semibold">stream-render-lab</h1>
        <button
          onClick={() => setConsoleOpen((v) => !v)}
          className="rounded border border-neutral-700 px-2 py-1 text-xs text-neutral-400 lg:hidden"
        >
          控制台
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        <ChatPanel
          messages={session.messages}
          renderer={renderer}
          streaming={session.streaming}
          inputDisabled={mode === 'replay'}
          onSend={(text) => void session.send(provider, text)}
          onStop={session.stop}
        />
        <div className={`${consoleOpen ? 'flex' : 'hidden'} lg:flex`}>
          <LabConsole
            mode={mode}
            onModeChange={setMode}
            provider={provider}
            onProviderChange={setProvider}
            renderer={renderer}
            onRendererChange={setRenderer}
            replayConfig={replayConfig}
            onReplayConfigChange={setReplayConfig}
            onPlay={() => session.replay(replayConfig)}
            onStop={session.stop}
            streaming={session.streaming}
            metrics={session.metrics}
          />
        </div>
      </div>
    </div>
  )
}
