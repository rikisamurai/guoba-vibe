import { Composer } from './components/chat/composer'
import { MessageList } from './components/chat/message-list'
import { ControlPanel } from './components/panel/control-panel'
import { ProviderSelect } from './components/provider-select'

export function App() {
  return (
    <div className="flex h-dvh flex-col">
      <header className="border-seam flex items-center gap-4 border-b px-6 py-3.5">
        <div>
          <div className="font-mono text-[15px] font-semibold tracking-wide">
            chat<span className="text-pulse">/</span>lab
          </div>
          <div className="text-faint text-[11px] tracking-[0.14em] uppercase">
            streaming render bench
          </div>
        </div>
        <div className="flex-1" />
        <ProviderSelect />
      </header>
      <div className="flex min-h-0 flex-1">
        <main className="flex min-w-0 flex-1 flex-col">
          <MessageList />
          <Composer />
        </main>
        <ControlPanel />
      </div>
    </div>
  )
}
