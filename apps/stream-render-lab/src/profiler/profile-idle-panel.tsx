import { useState } from 'react'

export function ProfileIdlePanel({ completed, total }: { completed: number; total: number }) {
  const [prediction, setPrediction] = useState<'latency' | 'work' | 'network'>('work')
  return (
    <article className="profile-idle-panel">
      <header>
        <p className="eyebrow eyebrow--cyan">BEFORE YOU RUN</p>
        <h2>先写下你的预测</h2>
      </header>
      <p>先选一个优化策略。以 M0 → M1 为例，合并同一帧内的更新会先改变什么？</p>
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
          <p>
            先 warmup，再按 AB/BA 交替运行所选策略。「我的实现」从 M0
            开始；改配置后重跑，允许用相同策略做 A/A 对照。
          </p>
        </section>
      </div>
    </article>
  )
}

export function MetricReadingGuide() {
  const items = [
    ['RAW → VISIBLE', '发布等了多久？', '从模拟 delta 到达到可见引擎快照；不是浏览器绘制时间。'],
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
