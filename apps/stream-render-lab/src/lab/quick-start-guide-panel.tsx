import {
  NetworkReadingObservation,
  PendingVisibleUpdate,
  SettledObservation,
  VisibleUpdatedObservation,
} from './quick-start-guide-observations'
import { QuickStartGuideOutput } from './quick-start-guide-output'
import { QuickStartGuideTimeline } from './quick-start-guide-timeline'
import type { QuickStartGuidePanelProps } from './quick-start-guide-view'

const TERMS = [
  { term: 'chunk', detail: '一次 read() 得到的数据', source: 'WHATWG Streams' },
  { term: 'SSE event', detail: '解析后派发的完整事件', source: 'WHATWG HTML' },
  {
    term: 'choices[].delta.content',
    detail: 'DeepSeek 新增的部分文本',
    source: 'DeepSeek Chat Completions',
  },
  { term: 'raw / visible', detail: '已接收文本 / 当前显示文本', source: '本课程模型' },
  {
    term: '显示文本状态更新',
    detail: 'visible 文本变化；不等于 React 提交 DOM 或浏览器绘制',
    source: '本课程模型',
  },
  {
    term: 'M0 / M4',
    detail: '逐增量更新 / 合并更新；不是行业标准',
    source: '本项目策略编号',
  },
] as const

const STEPS = [
  { label: '01 读取与解析', note: 'chunk → SSE event' },
  { label: '02 已接收与显示', note: '已接收文本 → 当前显示文本' },
  { label: '03 最终结果', note: '正确性 → 更新次数' },
] as const

export function QuickStartGuidePanel({
  actions,
  busy = false,
  snapshot,
}: QuickStartGuidePanelProps) {
  return (
    <section className="quick-guide" aria-busy={busy} aria-label="Quick Start 三步观察实验">
      <header className="quick-guide__intro">
        <span>引导实验 · 3 个观察点</span>
        <h2>逐增量更新（M0）与合并更新（M4）</h2>
        <p>浏览器读到一次数据，不等于模型新增一次文本，也不等于显示文本状态发生一次更新。</p>
      </header>
      <ol className="quick-guide__steps" aria-label="三个观察检查点">
        {STEPS.map(({ label, note }, index) => (
          <li data-state={stepState(index, snapshot.stage)} key={label}>
            <strong>{label}</strong>
            <span>{note}</span>
          </li>
        ))}
      </ol>
      <QuickStartGuideTimeline snapshot={snapshot} />
      <div className="quick-guide__outputs">
        <QuickStartGuideOutput pipeline={snapshot.pipelines.M0} profile="M0" />
        <QuickStartGuideOutput pipeline={snapshot.pipelines.M4} profile="M4" />
      </div>
      <div className="quick-guide__stage" aria-live="polite">
        {snapshot.stage === 'ready' || snapshot.stage === 'reading-network' ? (
          <NetworkReadingObservation snapshot={snapshot} />
        ) : null}
        {snapshot.stage === 'visible-update-pending' ? (
          <PendingVisibleUpdate snapshot={snapshot} />
        ) : null}
        {snapshot.stage === 'visible-updated' ? (
          <VisibleUpdatedObservation snapshot={snapshot} />
        ) : null}
        {snapshot.stage === 'settled' ? <SettledObservation snapshot={snapshot} /> : null}
        <GuideAction actions={actions} busy={busy} stage={snapshot.stage} />
      </div>
      <details className="quick-guide__terms">
        <summary>术语说明与来源</summary>
        <ol aria-label="流式响应术语来源">
          {TERMS.map(({ term, detail, source }) => (
            <li key={term}>
              <small>{source}</small>
              <strong>{term}</strong>
              <span>{detail}</span>
            </li>
          ))}
        </ol>
      </details>
      <output className="sr-only">已读取 {snapshot.progress.streamChunksRead} 个 chunk</output>
    </section>
  )
}

function GuideAction({
  actions,
  busy,
  stage,
}: Pick<QuickStartGuidePanelProps, 'actions' | 'busy'> & {
  stage: QuickStartGuidePanelProps['snapshot']['stage']
}) {
  const label =
    stage === 'visible-update-pending'
      ? '显示已接收文本'
      : stage === 'visible-updated'
        ? '继续到完整回复'
        : stage === 'settled'
          ? '重新观察'
          : '读取下一个 chunk'
  const run = () => {
    if (busy) return
    if (stage === 'visible-update-pending') void actions.advanceAnimationFrame()
    else if (stage === 'visible-updated') void actions.finish()
    else if (stage === 'settled') actions.reset()
    else void actions.readNextChunk()
  }
  return (
    <button aria-disabled={busy} type="button" onClick={run}>
      {label}
    </button>
  )
}

function stepState(index: number, stage: QuickStartGuidePanelProps['snapshot']['stage']) {
  const active =
    stage === 'settled'
      ? 2
      : stage === 'visible-update-pending' || stage === 'visible-updated'
        ? 1
        : 0
  if (index < active) return 'done'
  return index === active ? 'active' : 'upcoming'
}
