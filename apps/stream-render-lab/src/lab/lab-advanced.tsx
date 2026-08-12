import type { LabConfig } from './types'

interface Props {
  config: LabConfig
  disabled: boolean
  onPatch: (patch: Partial<LabConfig>) => void
}

export function LabAdvanced({ config, disabled, onPatch }: Props) {
  return (
    <details className="lab2-advanced">
      <summary>
        高级设置 <b>11</b>
        <span>每个值都会重新生成 wire 或改变引擎调度</span>
      </summary>
      <div className="lab2-advanced__grid">
        <SelectField
          label="Transport"
          disabled={disabled}
          value={config.transport}
          options={['readable-stream', 'async-iterable']}
          onChange={(transport) => onPatch({ transport })}
        />
        <SelectField
          label="Slice mode"
          disabled={disabled}
          value={config.sliceMode}
          options={['random', 'boundary-aware']}
          onChange={(sliceMode) => onPatch({ sliceMode })}
        />
        <NumberField
          label="Chunk min (bytes)"
          value={config.chunkMin}
          disabled={disabled}
          onChange={(chunkMin) => onPatch({ chunkMin })}
        />
        <NumberField
          label="Chunk max (bytes)"
          value={config.chunkMax}
          disabled={disabled}
          onChange={(chunkMax) => onPatch({ chunkMax })}
        />
        <NumberField
          label="Delay min (ms)"
          value={config.delayMin}
          disabled={disabled}
          onChange={(delayMin) => onPatch({ delayMin })}
        />
        <NumberField
          label="Delay max (ms)"
          value={config.delayMax}
          disabled={disabled}
          onChange={(delayMax) => onPatch({ delayMax })}
        />
        <NumberField
          label="Burstiness (%)"
          value={config.burstiness}
          disabled={disabled}
          onChange={(burstiness) => onPatch({ burstiness })}
        />
        <NumberField
          label="Seed"
          value={config.seed}
          disabled={disabled}
          onChange={(seed) => onPatch({ seed })}
        />
        <NumberField
          label="Commit cadence (ms)"
          value={config.commitCadenceMs}
          disabled={disabled}
          onChange={(commitCadenceMs) => onPatch({ commitCadenceMs })}
        />
        <SelectField
          label="Reveal"
          disabled={disabled}
          value={config.reveal}
          options={['direct', 'smooth']}
          onChange={(reveal) => onPatch({ reveal })}
        />
        <SelectField
          label="Trace"
          disabled={disabled}
          value={config.trace}
          options={['off', 'summary', 'full']}
          onChange={(trace) => onPatch({ trace })}
        />
      </div>
      <p>Random 可切进 UTF-8 字节；Boundary aware 尽量在空白、标点或换行处切片。</p>
    </details>
  )
}

function SelectField<Value extends string>(props: {
  label: string
  value: Value
  options: readonly Value[]
  disabled: boolean
  onChange: (value: Value) => void
}) {
  return (
    <label className="lab2-field">
      <span>{props.label}</span>
      <select
        disabled={props.disabled}
        value={props.value}
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

function NumberField(props: {
  label: string
  value: number
  disabled: boolean
  onChange: (value: number) => void
}) {
  return (
    <label className="lab2-field">
      <span>{props.label}</span>
      <input
        min={0}
        type="number"
        disabled={props.disabled}
        value={props.value}
        onChange={(event) => props.onChange(Number(event.target.value))}
      />
    </label>
  )
}
