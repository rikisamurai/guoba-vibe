import { cx } from '../../lib/cx'
import { updateSettings, useSettings } from '../../store/settings-store'
import type { RendererMode } from '../../types/message'

const MODES: Array<{ id: RendererMode; name: string; desc: string }> = [
  { id: 'M0', name: 'Naive', desc: 'full reparse per token' },
  { id: 'M1', name: 'Throttled', desc: 'merged commits + tail repair' },
  { id: 'M2', name: 'Blocks', desc: 'stable prefix · dirty tail' },
  { id: 'M3', name: 'Scheduled', desc: 'heavy nodes on own clock' },
]

export function ModeSection() {
  const settings = useSettings()
  return (
    <section className="border-seam border-b px-5 py-4.5">
      <h2 className="text-faint mb-3.5 font-mono text-[10.5px] font-normal tracking-[0.16em] uppercase">
        Renderer
      </h2>
      {MODES.map((mode) => (
        <button
          key={mode.id}
          type="button"
          onClick={() => updateSettings({ mode: mode.id })}
          className={cx(
            'mb-1 flex w-full items-baseline gap-2.5 rounded-lg border px-3 py-2 text-left',
            mode.id === settings.mode
              ? 'border-pulse/35 bg-pulse/12'
              : 'border-transparent hover:bg-panel-2',
          )}
        >
          <span
            className={cx(
              'w-[22px] font-mono text-[11.5px]',
              mode.id === settings.mode ? 'text-pulse' : 'text-faint',
            )}
          >
            {mode.id}
          </span>
          <span>
            <span className="block text-[13.5px] font-medium">{mode.name}</span>
            <span className="text-mute block text-[11.5px]">{mode.desc}</span>
          </span>
        </button>
      ))}
      <label className="text-mute mt-3 flex items-center justify-between text-xs">
        commit
        <input
          type="range"
          min={16}
          max={160}
          step={8}
          value={settings.throttleMs}
          disabled={settings.mode === 'M0'}
          onChange={(event) => updateSettings({ throttleMs: Number(event.target.value) })}
          className="accent-pulse mx-3 flex-1 disabled:opacity-40"
        />
        <span className="text-ink font-mono text-[11.5px]">{settings.throttleMs}ms</span>
      </label>
      <label className="text-mute mt-2 flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={settings.smoothing}
          disabled={settings.mode === 'M0'}
          onChange={(event) => updateSettings({ smoothing: event.target.checked })}
          className="accent-pulse"
        />
        smooth reveal (observable draining)
      </label>
    </section>
  )
}
