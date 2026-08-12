import { useState } from 'react'

export function ProfileIdlePanel({ completed, total }: { completed: number; total: number }) {
  const [prediction, setPrediction] = useState<'latency' | 'work' | 'network'>('work')
  return (
    <article className="profile-idle-panel">
      <header>
        <p className="eyebrow eyebrow--cyan">BEFORE YOU RUN</p>
        <h2>先写下你的预测</h2>
      </header>
      <p>如果 M1 真正合并了同一帧内的更新，哪两个指标应该先变化？</p>
      <div className="profile-predictions">
        <button
          aria-pressed={prediction === 'latency'}
          className={prediction === 'latency' ? 'is-selected' : undefined}
          type="button"
          onClick={() => setPrediction('latency')}
        >
          <span>A</span>raw→visible 大幅降低
        </button>
        <button
          aria-pressed={prediction === 'work'}
          className={prediction === 'work' ? 'is-selected' : undefined}
          type="button"
          onClick={() => setPrediction('work')}
        >
          <span>B</span>engine commit 与 parse work 降低
        </button>
        <button
          aria-pressed={prediction === 'network'}
          className={prediction === 'network' ? 'is-selected' : undefined}
          type="button"
          onClick={() => setPrediction('network')}
        >
          <span>C</span>synthetic replay 的 chunk 数降低
        </button>
      </div>
      <div className="profile-waiting">
        <div>
          <span>{total === 0 ? 'WAITING' : 'RUNNING'}</span>
          <strong>
            {completed} / {total || 12}
          </strong>
          <small>replays</small>
        </div>
        <section>
          <h3>{total === 0 ? '结果区仍为空' : '正在执行隔离的 A/B run'}</h3>
          <p>先完成 warmup，再交替运行 M0 与 M1。结果会明确区分单次读数与多次聚合。</p>
        </section>
      </div>
    </article>
  )
}

export function MetricReadingGuide() {
  const items = [
    ['RAW → VISIBLE', '用户等了多久？', '比较 synthetic replay arrival 与 React 发布时间。'],
    ['PARSE WORK', '重复做了多少工作？', 'parsed code units 比 wall-clock 更稳定。'],
    ['ENGINE COMMITS', '发布是否被合并？', 'snapshot commit 应受显示帧而不是 delta 数约束。'],
    [
      'LONG TASKS',
      '主线程是否被阻塞？',
      '支持该 API 时定位超过 50ms 的峰值，否则显示 unsupported。',
    ],
  ]
  return (
    <section className="profile-reading-guide">
      <header>
        <div>
          <p className="eyebrow">HOW TO READ</p>
          <h2>每个指标只回答一个问题</h2>
        </div>
      </header>
      <div>
        {items.map(([label, question, answer], index) => (
          <article key={label}>
            <b>0{index + 1}</b>
            <span>
              <small>{label}</small>
              <strong>{question}</strong>
              <p>{answer}</p>
            </span>
          </article>
        ))}
      </div>
    </section>
  )
}
