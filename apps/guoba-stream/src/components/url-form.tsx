import { Link2, LoaderCircle, ShieldCheck } from 'lucide-react'
import { useState } from 'react'

export function UrlForm({
  loading,
  onSubmit,
}: {
  loading: boolean
  onSubmit: (url: string) => void
}) {
  const [value, setValue] = useState('')

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (value.trim() && !loading) onSubmit(value.trim())
      }}
    >
      <div className="flex gap-2">
        <label className="border-seam bg-pan focus-within:border-ember/70 focus-within:outline-ember flex flex-1 items-center gap-2 rounded-lg border px-3 transition-colors focus-within:outline-2 focus-within:outline-offset-2">
          <Link2 className="text-bran size-4 shrink-0" aria-hidden />
          <input
            type="url"
            inputMode="url"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="https://x.com/…/status/…"
            className="placeholder:text-bran h-11 w-full bg-transparent text-base outline-none"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="bg-ember text-ember-ink hover:bg-ember-soft disabled:hover:bg-ember flex h-11 items-center gap-1.5 rounded-lg px-4 font-medium transition duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
        >
          {loading && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
          Fetch
        </button>
      </div>
      <p className="text-faint mt-2 flex items-center gap-1.5 text-xs">
        <ShieldCheck className="size-3.5 shrink-0" aria-hidden />
        Tracking params are stripped automatically
      </p>
    </form>
  )
}
