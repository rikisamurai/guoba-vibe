import type { AbProfileConfig } from './ab-types'
import { PROFILE_FIXTURES } from './profile-fixtures'
import { PROFILE_OPTIONS, profileLabel } from './profile-options'

import './profiler-controls.css'

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
      <div className="profile-fields profile-strategies">
        {(['baseline', 'challenger'] as const).map((role) => (
          <label key={role}>
            <span>{role === 'baseline' ? '基线策略' : '对照策略'}</span>
            <select
              aria-label={role === 'baseline' ? '基线策略' : '对照策略'}
              disabled={running}
              value={config[role]}
              onChange={(event) => {
                const next = PROFILE_OPTIONS.find(({ value }) => value === event.target.value)
                if (next) onChange({ ...config, [role]: next.value })
              }}
            >
              {PROFILE_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      {config.baseline === 'mine' || config.challenger === 'mine' ? (
        <p className="profile-policy-note">
          当前{profileLabel('mine')}：编辑 <code>src/my-chat/render-policy.ts</code>
          ，保存后重新采样。该配置选择已有引擎策略。
        </p>
      ) : null}
      <div className="profile-fields">
        <label>
          <span>Fixture</span>
          <select
            aria-label="Fixture"
            value={config.fixture}
            disabled={running}
            onChange={(event) => {
              const next = PROFILE_FIXTURES.find(({ value }) => value === event.target.value)
              if (next) onChange({ ...config, fixture: next.value })
            }}
          >
            {PROFILE_FIXTURES.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>文本规模（UTF-16）</span>
          <select
            aria-label="内容规模"
            disabled={running}
            value={config.textKChars}
            onChange={(event) => numberField('textKChars', event.target.value)}
          >
            <option value="4">4,096 code units</option>
            <option value="8">8,192 code units</option>
            <option value="16">16,384 code units</option>
          </select>
        </label>
        <label>
          <span>每个 delta</span>
          <select
            aria-label="Delta size"
            disabled={running}
            value={config.chunkSize}
            onChange={(event) => numberField('chunkSize', event.target.value)}
          >
            <option value="48">48 code units</option>
            <option value="96">96 code units</option>
            <option value="192">192 code units</option>
          </select>
        </label>
        <label>
          <span>模拟字节到达间隔</span>
          <select
            aria-label="Arrival cadence"
            disabled={running}
            value={config.cadenceMs}
            onChange={(event) => numberField('cadenceMs', event.target.value)}
          >
            <option value="1">1 ms</option>
            <option value="2">2 ms</option>
            <option value="4">4 ms</option>
            <option value="32">32 ms · 慢速输入</option>
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
        <strong>相同输入，先验证正确性</strong>
        <span>
          两组使用相同文本、字节分片与计划到达时间。解析和渲染在当前浏览器真实执行；没有真实网络或模型请求。
        </span>
      </div>
      <button className="profile-start" disabled={running} onClick={onStart} type="button">
        {running ? `正在运行 ${progress.completed}/${progress.total}` : '开始 A/B 采样'}
      </button>
    </article>
  )
}
