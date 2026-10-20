import { useState } from 'react'

export interface RenderStage {
  id: string
  name: string
  summary: string
}

interface ExperimentConsoleProps {
  stages?: RenderStage[]
  initialStage?: string
  running?: boolean
  onPlay?: (stage: string, running: boolean) => void
}

const DEFAULT_STAGES: RenderStage[] = [
  { id: 'M0', name: 'Naive', summary: '每次 delta 全量解析' },
  { id: 'M1', name: 'Batch', summary: '合并到显示时钟' },
  { id: 'M2', name: 'Blocks', summary: '冻结稳定前缀' },
  { id: 'M3', name: 'Heavy', summary: '重节点独立调度' },
]

export function ExperimentConsole({
  stages = DEFAULT_STAGES,
  initialStage = 'M2',
  running: controlledRunning,
  onPlay,
}: ExperimentConsoleProps) {
  const [selected, setSelected] = useState(initialStage)
  const [internalRunning, setInternalRunning] = useState(false)
  const running = controlledRunning ?? internalRunning
  const activeStage = stages.find((stage) => stage.id === selected) ?? stages[0]

  const play = () => {
    const next = !running
    if (controlledRunning === undefined) setInternalRunning(next)
    onPlay?.(selected, next)
  }

  return (
    <section className="experiment-console" aria-label="实验控制台">
      <div className="console-heading">
        <div>
          <p className="eyebrow eyebrow--dark">Experiment 02</p>
          <h2>控制显示时钟</h2>
        </div>
        <span className={running ? 'console-status is-running' : 'console-status'}>
          {running ? 'RUNNING' : 'READY'}
        </span>
      </div>
      <fieldset className="stage-selector">
        <legend>选择渲染阶段</legend>
        <div className="stage-selector__grid">
          {stages.map((stage) => (
            <button
              key={stage.id}
              type="button"
              aria-pressed={selected === stage.id}
              onClick={() => setSelected(stage.id)}
            >
              <strong>{stage.id}</strong>
              <span>{stage.name}</span>
              <small>{stage.summary}</small>
            </button>
          ))}
        </div>
      </fieldset>
      <div className="console-readout">
        <div>
          <span>ACTIVE PIPELINE</span>
          <strong>
            {activeStage.id} · {activeStage.name}
          </strong>
        </div>
        <div>
          <span>FIXTURE</span>
          <strong>boundary-cuts.md</strong>
        </div>
        <div>
          <span>WIRE PROFILE</span>
          <strong>jitter · 1×</strong>
        </div>
      </div>
      <button className="signal-button" type="button" onClick={play}>
        <span aria-hidden="true">{running ? '■' : '▶'}</span>
        {running ? '停止样本' : '播放确定性样本'}
      </button>
    </section>
  )
}
