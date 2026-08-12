import type { LessonPresetId } from '@stream-render/contract'
import { useState } from 'react'

import { LabAdvanced } from './lab-advanced'
import { LabControls } from './lab-controls'
import { LabInspector } from './lab-inspector'
import { LabLessonControls } from './lab-lesson-controls'
import { labPreset, presetConfig } from './presets'
import type { LabConfig, LabInspectorTab, LabSettledReport } from './types'
import { useLabSession } from './use-lab-session'

interface Props {
  embedded?: boolean
  initialPreset?: LessonPresetId
  onSettled?: (report: LabSettledReport) => void
}

export function LabWorkbench({
  embedded = false,
  initialPreset = 'quick-start-burst',
  onSettled,
}: Props) {
  const [config, setConfig] = useState(() => presetConfig(initialPreset))
  const [tab, setTab] = useState<LabInspectorTab>(
    initialPreset === 'sse-edge-cases' ? 'wire' : 'rendered',
  )
  const session = useLabSession(config, onSettled)
  const locked = session.state.status === 'running' || session.state.status === 'paused'
  const preset = labPreset(config.presetId)

  function patchConfig(patch: Partial<LabConfig>) {
    setConfig((current) => normalizeConfig(current, patch))
  }

  function selectPreset(id: LessonPresetId) {
    session.reset()
    setConfig(presetConfig(id))
    setTab(id === 'sse-edge-cases' ? 'wire' : 'rendered')
  }

  return (
    <div className={`lab2-workbench${embedded ? ' is-embedded' : ''}`}>
      <div className="lab2-readout">
        <div>
          <span>STREAMING WORKBENCH</span>
          <strong>{preset.summary}</strong>
          <small>{preset.question}</small>
        </div>
        <dl>
          <div>
            <dt>状态</dt>
            <dd>{session.state.status}</dd>
          </div>
          <div>
            <dt>进度</dt>
            <dd>{progressPercent(session.state.progress)}%</dd>
          </div>
          <div>
            <dt>字节</dt>
            <dd>{session.state.trace.wire.reduce((sum, item) => sum + item.byteLength, 0)}</dd>
          </div>
        </dl>
      </div>
      <LabControls
        config={config}
        disabled={locked}
        lockPreset={embedded}
        status={session.state.status}
        progress={session.state.progress}
        onPreset={selectPreset}
        onPatch={patchConfig}
        onStart={session.start}
        onPause={session.pause}
        onResume={session.resume}
        onStep={session.step}
        onReset={session.reset}
      />
      {embedded ? null : <LabAdvanced config={config} disabled={locked} onPatch={patchConfig} />}
      {embedded ? (
        <LabLessonControls config={config} disabled={locked} onPatch={patchConfig} />
      ) : null}
      <div className="lab2-main">
        <label className="lab2-editor">
          <span>INPUT · editable Markdown</span>
          <textarea
            disabled={locked}
            spellCheck={false}
            value={config.input}
            onChange={(event) => patchConfig({ input: event.target.value })}
          />
        </label>
        <LabInspector
          active={tab}
          baseline={config.baseline}
          challenger={config.challenger}
          state={session.state}
          onTab={setTab}
        />
      </div>
    </div>
  )
}

function normalizeConfig(current: LabConfig, patch: Partial<LabConfig>): LabConfig {
  const next = { ...current, ...patch }
  if (next.baseline === next.challenger) {
    if (patch.baseline) next.challenger = current.baseline
    else next.baseline = current.challenger
  }
  next.chunkMin = clamp(next.chunkMin, 1, 2_048)
  next.chunkMax = clamp(next.chunkMax, next.chunkMin, 4_096)
  next.delayMin = clamp(next.delayMin, 0, 10_000)
  next.delayMax = clamp(next.delayMax, next.delayMin, 10_000)
  next.burstiness = clamp(next.burstiness, 0, 100)
  next.commitCadenceMs = clamp(next.commitCadenceMs, 1, 1_000)
  return next
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum))
}

function progressPercent(progress: { current: number; total: number }): number {
  if (progress.total === 0) return 0
  return Math.round((progress.current / progress.total) * 100)
}
