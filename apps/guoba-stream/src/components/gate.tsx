import { Flame, KeyRound } from 'lucide-react'
import { useState } from 'react'

import { pingAccessKey } from '../lib/api'

export function Gate({ onUnlocked }: { onUnlocked: (key: string) => void }) {
  const [value, setValue] = useState('')
  const [checking, setChecking] = useState(false)
  const [failed, setFailed] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const key = value.trim()
    if (!key || checking) return
    setChecking(true)
    setFailed(false)
    const ok = await pingAccessKey(key)
    setChecking(false)
    if (ok) onUnlocked(key)
    else setFailed(true)
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <div className="flex items-center gap-2">
        <Flame className="text-ember size-6" aria-hidden />
        <span className="font-display text-3xl font-semibold">
          guoba<span className="text-ember">stream</span>
        </span>
      </div>
      <p className="text-bran mt-2 text-xs text-balance">tweet videos, saved crispy</p>
      <form onSubmit={(e) => void submit(e)} className="mt-8 flex w-full max-w-sm gap-2">
        <label className="border-seam bg-pan focus-within:border-ember/70 focus-within:outline-ember flex flex-1 items-center gap-2 rounded-lg border px-3 transition-colors focus-within:outline-2 focus-within:outline-offset-2">
          <KeyRound className="text-bran size-4 shrink-0" aria-hidden />
          <input
            type="password"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Access code"
            className="placeholder:text-bran h-11 w-full bg-transparent text-base outline-none"
          />
        </label>
        <button
          type="submit"
          disabled={checking}
          className="bg-ember text-ember-ink hover:bg-ember-soft disabled:hover:bg-ember h-11 rounded-lg px-5 font-medium transition duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
        >
          {checking ? 'Checking…' : 'Unlock'}
        </button>
      </form>
      {failed && (
        <p className="text-scorch-soft animate-fade-in mt-3 text-sm">That code didn&apos;t work</p>
      )}
      <p className="text-faint mt-6 text-xs">Invite-only. Codes are issued personally.</p>
    </main>
  )
}
