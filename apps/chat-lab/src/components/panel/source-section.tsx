import { cx } from '../../lib/cx'
import { CORPORA } from '../../sim/corpus'
import { PROFILE_IDS } from '../../sim/profiles'
import { updateSettings, useSettings } from '../../store/settings-store'

const SPEEDS = [0.5, 1, 2, 4]

export function SourceSection() {
  const settings = useSettings()
  return (
    <section className="border-seam border-b px-5 py-4.5">
      <h2 className="text-faint mb-3.5 font-mono text-[10.5px] font-normal tracking-[0.16em] uppercase">
        Source
      </h2>
      <div className="border-seam bg-panel-2 mb-3 flex rounded-lg border p-[3px]">
        <button
          type="button"
          disabled
          title="Live API lands with the proxy stage"
          className="text-faint flex-1 cursor-not-allowed rounded-md py-1.5 text-center text-[12.5px]"
        >
          Live API
        </button>
        <button
          type="button"
          className="bg-void flex-1 rounded-md py-1.5 text-center text-[12.5px] font-medium"
        >
          Simulator
        </button>
      </div>
      <label className="text-mute flex items-center justify-between py-2 text-[12.5px]">
        Corpus
        <select
          value={settings.corpusId}
          onChange={(event) => updateSettings({ corpusId: event.target.value })}
          className="border-seam bg-panel-2 text-ink rounded-md border px-2 py-1 font-mono text-xs outline-none"
        >
          {CORPORA.map((corpus) => (
            <option key={corpus.id} value={corpus.id}>
              {corpus.label}
            </option>
          ))}
        </select>
      </label>
      <div className="text-mute pt-1 text-[12.5px]">Profile</div>
      <div className="mt-1.5 flex gap-1.5">
        {PROFILE_IDS.map((profile) => (
          <button
            key={profile}
            type="button"
            onClick={() => updateSettings({ profileId: profile })}
            className={cx(
              'rounded-full border px-2 py-1 font-mono text-[10.5px]',
              profile === settings.profileId
                ? 'border-pulse text-pulse'
                : 'border-seam text-mute hover:border-faint',
            )}
          >
            {profile}
          </button>
        ))}
      </div>
      <label className="text-mute mt-3 flex items-center justify-between text-[12.5px]">
        Speed
        <select
          value={settings.speed}
          onChange={(event) => updateSettings({ speed: Number(event.target.value) })}
          className="border-seam bg-panel-2 text-ink rounded-md border px-2 py-1 font-mono text-xs outline-none"
        >
          {SPEEDS.map((speed) => (
            <option key={speed} value={speed}>
              {speed}×
            </option>
          ))}
        </select>
      </label>
    </section>
  )
}
