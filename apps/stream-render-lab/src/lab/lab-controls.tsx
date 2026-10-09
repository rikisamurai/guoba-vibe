import type { LessonPresetId } from '@stream-render/contract'

import { LAB_PRESETS } from './presets'
import { RENDER_PROFILES, type LabConfig, type LabPlaybackStatus } from './types'

interface Props {
  config: LabConfig
  disabled: boolean
  lockPreset?: boolean
  status: LabPlaybackStatus
  progress: { current: number; total: number }
  onPreset: (id: LessonPresetId) => void
  onPatch: (patch: Partial<LabConfig>) => void
  onStart: () => void
  onPause: () => void
  onResume: () => void
  onStep: () => void
  onReset: () => void
}

export function LabControls(props: Props) {
  const { config, status, progress } = props
  const percentage = progress.total === 0 ? 0 : (progress.current / progress.total) * 100
  return (
    <section className="lab2-controls" aria-label="流式回放控制">
      <label className="lab2-field lab2-field--preset">
        <span>场景 PRESET</span>
        <select
          disabled={props.disabled || props.lockPreset}
          value={config.presetId}
          onChange={(event) => {
            const preset = LAB_PRESETS.find((candidate) => candidate.id === event.target.value)
            if (preset) props.onPreset(preset.id)
          }}
        >
          {LAB_PRESETS.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.label}
            </option>
          ))}
        </select>
      </label>
      <div className="lab2-pipelines">
        <span>对照 PIPELINES</span>
        <ProfileSelect
          label="Baseline"
          value={config.baseline}
          disabled={props.disabled}
          onChange={(baseline) => props.onPatch({ baseline })}
        />
        <i>VS</i>
        <ProfileSelect
          label="Challenger"
          value={config.challenger}
          disabled={props.disabled}
          onChange={(challenger) => props.onPatch({ challenger })}
        />
      </div>
      <div className="lab2-actions">
        {status === 'running' ? (
          <button type="button" onClick={props.onPause}>
            暂停
          </button>
        ) : status === 'paused' ? (
          <button className="is-primary" type="button" onClick={props.onResume}>
            继续播放
          </button>
        ) : (
          <button className="is-primary" type="button" onClick={props.onStart}>
            开始回放
          </button>
        )}
        <button disabled={status === 'settled'} type="button" onClick={props.onStep}>
          单步
        </button>
        <button type="button" onClick={props.onReset}>
          重置
        </button>
      </div>
      <div className="lab2-progress" aria-label={`回放进度 ${progress.current}/${progress.total}`}>
        <span style={{ width: `${percentage}%` }} />
        <small>
          chunk {progress.current} / {progress.total}
        </small>
      </div>
    </section>
  )
}

function ProfileSelect({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string
  value: LabConfig['baseline']
  disabled: boolean
  onChange: (value: LabConfig['baseline']) => void
}) {
  return (
    <label>
      <span className="sr-only">{label}</span>
      <select
        disabled={disabled}
        value={value}
        onChange={(event) => {
          const profile = RENDER_PROFILES.find((candidate) => candidate === event.target.value)
          if (profile) onChange(profile)
        }}
      >
        {RENDER_PROFILES.map((profile) => (
          <option key={profile}>{profile}</option>
        ))}
      </select>
    </label>
  )
}
