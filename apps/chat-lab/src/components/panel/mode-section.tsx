import { cx } from '../../lib/cx'

const MODES = [
  { id: 'M0', name: 'Naive', desc: 'full reparse per token' },
  { id: 'M1', name: 'Throttled', desc: 'merged commits + tail repair' },
  { id: 'M2', name: 'Blocks', desc: 'stable prefix · dirty tail' },
  { id: 'M3', name: 'Scheduled', desc: 'heavy nodes on own clock' },
] as const

export function ModeSection() {
  const active = 'M0'
  return (
    <section className="border-seam border-b px-5 py-4.5">
      <h2 className="text-faint mb-3.5 font-mono text-[10.5px] font-normal tracking-[0.16em] uppercase">
        Renderer
      </h2>
      {MODES.map((mode) => (
        <div
          key={mode.id}
          className={cx(
            'mb-1 flex items-baseline gap-2.5 rounded-lg border px-3 py-2',
            mode.id === active ? 'border-pulse/35 bg-pulse/12' : 'border-transparent',
          )}
        >
          <span
            className={cx(
              'w-[22px] font-mono text-[11.5px]',
              mode.id === active ? 'text-pulse' : 'text-faint',
            )}
          >
            {mode.id}
          </span>
          <span>
            <span className="block text-[13.5px] font-medium">{mode.name}</span>
            <span className="text-mute block text-[11.5px]">{mode.desc}</span>
          </span>
        </div>
      ))}
      <div className="text-mute mt-3 flex items-center justify-between text-xs">
        <span>commit</span>
        <div className="bg-seam relative mx-3 h-[3px] flex-1 rounded-sm">
          <span className="bg-pulse absolute -top-1 left-[42%] size-3 rounded-full" />
        </div>
        <span className="text-ink font-mono text-[11.5px]">48ms</span>
      </div>
    </section>
  )
}
