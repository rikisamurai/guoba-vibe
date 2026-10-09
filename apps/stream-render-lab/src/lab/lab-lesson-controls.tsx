import type { LabConfig } from './types'

interface Props {
  config: LabConfig
  disabled: boolean
  onPatch: (patch: Partial<LabConfig>) => void
}

export function LabLessonControls({ config, disabled, onPatch }: Props) {
  if (config.presetId === 'quick-start-burst') return null
  return (
    <section className="lab2-lesson-controls" aria-label="本课实验变量">
      <header>
        <span>LESSON VARIABLES</span>
        <small>只开放本章需要改变的变量</small>
      </header>
      {config.presetId === 'sse-edge-cases' ? (
        <div>
          <Select
            label="Transport"
            value={config.transport}
            options={['readable-stream', 'async-iterable']}
            disabled={disabled}
            onChange={(transport) => onPatch({ transport })}
          />
          <Select
            label="Slice mode"
            value={config.sliceMode}
            options={['random', 'boundary-aware']}
            disabled={disabled}
            onChange={(sliceMode) => onPatch({ sliceMode })}
          />
          <NumberInput
            label="Chunk min (bytes)"
            value={config.chunkMin}
            disabled={disabled}
            onChange={(chunkMin) => onPatch({ chunkMin })}
          />
          <NumberInput
            label="Chunk max (bytes)"
            value={config.chunkMax}
            disabled={disabled}
            onChange={(chunkMax) => onPatch({ chunkMax })}
          />
          <button
            type="button"
            disabled={disabled}
            onClick={() => onPatch({ chunkMin: 1, chunkMax: 1, delayMin: 0, delayMax: 0 })}
          >
            Every byte · 1B
          </button>
        </div>
      ) : (
        <div>
          <NumberInput
            label="Commit cadence (ms)"
            value={config.commitCadenceMs}
            disabled={disabled}
            onChange={(commitCadenceMs) => onPatch({ commitCadenceMs })}
          />
        </div>
      )}
    </section>
  )
}

function Select<Value extends string>(props: {
  label: string
  value: Value
  options: readonly Value[]
  disabled: boolean
  onChange: (value: Value) => void
}) {
  return (
    <label>
      <span>{props.label}</span>
      <select
        value={props.value}
        disabled={props.disabled}
        onChange={(event) => {
          const selected = props.options.find((option) => option === event.target.value)
          if (selected !== undefined) props.onChange(selected)
        }}
      >
        {props.options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  )
}

function NumberInput(props: {
  label: string
  value: number
  disabled: boolean
  onChange: (value: number) => void
}) {
  return (
    <label>
      <span>{props.label}</span>
      <input
        min={0}
        type="number"
        value={props.value}
        disabled={props.disabled}
        onChange={(event) => props.onChange(Number(event.target.value))}
      />
    </label>
  )
}
