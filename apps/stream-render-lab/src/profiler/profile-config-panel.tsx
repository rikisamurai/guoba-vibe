import type { AbProfileConfig } from './ab-types'

interface Props {
  config: AbProfileConfig
  onChange: (config: AbProfileConfig) => void
  onStart: () => void
  progress: { completed: number; total: number }
  running: boolean
}

export function ProfileConfigPanel({ config, onChange, onStart, progress, running }: Props) {
  function numberField(key: keyof AbProfileConfig, value: string): void {
    onChange({ ...config, [key]: Number(value) })
  }

  return (
    <article className="profile-manifest">
      <header>
        <div>
          <p className="eyebrow eyebrow--orange">RUN MANIFEST</p>
          <h2>本次实验配置</h2>
        </div>
        <span>{running ? `${progress.completed}/${progress.total} runs` : '尚未开始'}</span>
      </header>
      <div className="profile-compare">
        <ModeCard label="BASELINE" profile="M0" text="每个 delta 全文 parse + render" />
        <i>VS</i>
        <ModeCard label="CHALLENGER" profile="M1" text="frame batching + drain" />
      </div>
      <div className="profile-fields">
        <label>
          <span>Fixture</span>
          <select aria-label="Fixture" defaultValue={config.fixture} disabled>
            <option value="mixed-markdown">Quick Start · mixed Markdown</option>
          </select>
        </label>
        <label>
          <span>内容规模</span>
          <select
            aria-label="内容规模"
            disabled={running}
            value={config.sizeKb}
            onChange={(event) => numberField('sizeKb', event.target.value)}
          >
            <option value="4">4 KB</option>
            <option value="8">8 KB</option>
            <option value="16">16 KB</option>
          </select>
        </label>
        <label>
          <span>Delta size</span>
          <select
            aria-label="Delta size"
            disabled={running}
            value={config.chunkSize}
            onChange={(event) => numberField('chunkSize', event.target.value)}
          >
            <option value="48">48 chars</option>
            <option value="96">96 chars</option>
            <option value="192">192 chars</option>
          </select>
        </label>
        <label>
          <span>Synthetic arrival cadence</span>
          <select
            aria-label="Arrival cadence"
            disabled={running}
            value={config.cadenceMs}
            onChange={(event) => numberField('cadenceMs', event.target.value)}
          >
            <option value="1">1 ms</option>
            <option value="2">2 ms</option>
            <option value="4">4 ms</option>
          </select>
        </label>
        <label>
          <span>Warmup</span>
          <select
            aria-label="Warmup"
            disabled={running}
            value={config.warmups}
            onChange={(event) => numberField('warmups', event.target.value)}
          >
            <option value="0">0 run</option>
            <option value="1">1 run</option>
          </select>
        </label>
        <label>
          <span>Measurements</span>
          <select
            aria-label="Measurements"
            disabled={running}
            value={config.repetitions}
            onChange={(event) => numberField('repetitions', event.target.value)}
          >
            <option value="3">3 runs</option>
            <option value="5">5 runs</option>
          </select>
        </label>
      </div>
      <div className="profile-collects">
        <strong>将采集</strong>
        <span>
          synthetic replay arrival · decode · SSE · provider · parse · React · heavy · long task
          (when supported)
        </span>
      </div>
      <button className="profile-start" disabled={running} onClick={onStart} type="button">
        {running ? `正在运行 ${progress.completed}/${progress.total}` : '开始 A/B 采样'}
      </button>
    </article>
  )
}

function ModeCard({ label, profile, text }: { label: string; profile: string; text: string }) {
  return (
    <div>
      <small>{label}</small>
      <div className={`profile-mode profile-mode--${profile.toLowerCase()}`}>
        <b>{profile}</b>
        <span>{text}</span>
      </div>
    </div>
  )
}
