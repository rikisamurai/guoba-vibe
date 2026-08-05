import { ChevronDown } from 'lucide-react'

import { Composer } from './components/chat/composer'
import { MessageList } from './components/chat/message-list'
import { ControlPanel } from './components/panel/control-panel'

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
        <button
          type="button"
          className="border-seam bg-panel flex items-center gap-2 rounded-lg border px-3 py-2 font-mono text-[12.5px]"
        >
          <span className="bg-pulse size-[7px] rounded-full" />
          DeepSeek · deepseek-chat
          <ChevronDown className="text-faint size-3.5" />
        </button>
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
