import { ChevronDown } from 'lucide-react'

import { cx } from '../../lib/cx'

const PROFILES = ['ideal', 'jitter', 'burst', 'boundary'] as const

export function SourceSection() {
  const activeProfile = 'jitter'
  return (
    <section className="border-seam border-b px-5 py-4.5">
      <h2 className="text-faint mb-3.5 font-mono text-[10.5px] font-normal tracking-[0.16em] uppercase">
        Source
      </h2>
      <div className="border-seam bg-panel-2 mb-3 flex rounded-lg border p-[3px]">
        <span className="text-mute flex-1 rounded-md py-1.5 text-center text-[12.5px]">
          Live API
        </span>
        <span className="bg-void flex-1 rounded-md py-1.5 text-center text-[12.5px] font-medium">
          Simulator
        </span>
      </div>
      <div className="text-mute flex items-center justify-between py-2 text-[12.5px]">
        <span>Corpus</span>
        <button
          type="button"
          className="border-seam bg-panel-2 text-ink flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-xs"
        >
          code-heavy tour
          <ChevronDown className="text-faint size-3" />
        </button>
      </div>
      <div className="text-mute pt-1 text-[12.5px]">Profile</div>
      <div className="mt-1.5 flex gap-1.5">
        {PROFILES.map((profile) => (
          <span
            key={profile}
            className={cx(
              'rounded-full border px-2 py-1 font-mono text-[10.5px]',
              profile === activeProfile ? 'border-pulse text-pulse' : 'border-seam text-mute',
            )}
          >
            {profile}
          </span>
        ))}
      </div>
    </section>
  )
}
