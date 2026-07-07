import { Flame } from 'lucide-react'
import { useState } from 'react'

import { Gate } from './components/gate'
import { loadAccessKey, saveAccessKey } from './lib/access-key'

export function App() {
  const [accessKey, setAccessKey] = useState<string | null>(() => loadAccessKey())

  if (!accessKey) {
    return (
      <Gate
        onUnlocked={(key) => {
          saveAccessKey(key)
          setAccessKey(key)
        }}
      />
    )
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col px-4 pt-6">
      <header className="mb-5 flex items-center gap-2">
        <Flame className="text-ember size-5" aria-hidden />
        <span className="font-display text-xl font-semibold">
          guoba<span className="text-ember">stream</span>
        </span>
      </header>
    </div>
  )
}
