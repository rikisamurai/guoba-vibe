import { Profiler } from 'react'
import { Link } from 'react-router-dom'

import { MetricGrid } from '../components/metric-grid'
import { PageHero } from '../components/page-hero'
import { TraceTimeline } from '../components/trace-timeline'
import { formatProfileMs, profileMetrics } from '../profiler/profile-metrics'
import { useBrowserProfile } from '../profiler/use-browser-profile'
import { RenderDocumentView } from '../rendering/render-document'

export default function ProfilerPage() {
  const { snapshot, report, sampling, onRender, run } = useBrowserProfile()
  const answer = snapshot?.parts.find((part) => part.kind === 'answer')
  const phase = sampling ? (snapshot?.phase ?? 'connecting') : report ? 'settled' : 'idle'
  const reactP95 = report?.reactRenderP95Ms ?? 0
  const withinFrame = report !== null && report.reactCommits > 0 && reactP95 <= 16.7

  return (
    <div className="page profiler-page">
      <PageHero
        compact
        eyebrow="PROFILER · FIXED BROWSER REPLAY"
        title="把一次回答读成性能轨迹"
        lead="固定 Replay trace 预热 1 次后连续采样 5 次；数值来自当前浏览器的 BrowserClock 与 production profiling build，只用于本机诊断，不作为跨机器 CI 门槛。"
        actions={
          <>
            <button
              className="text-link profile-rerun"
              disabled={sampling}
              onClick={run}
              type="button"
            >
              {sampling ? '采样中…' : '重新采样'}
            </button>
            <Link className="text-link" to="/bench">
              查看基准对照 ↗
            </Link>
          </>
        }
      />
      <p aria-label="性能采样状态" className="profile-status" role="status">
        {phase} · production · boundary-cuts replay
      </p>
      <section className="profile-board">
        <div className="profile-summary">
          <div className="profile-summary__title">
            <p className="eyebrow eyebrow--dark">REAL TRACE SUMMARY</p>
            <h2>Production · M4 pipeline</h2>
            <span className={`quality-stamp${withinFrame ? '' : ' quality-stamp--review'}`}>
              {report ? (
                withinFrame ? (
                  <>
                    WITHIN
                    <br />
                    FRAME
                  </>
                ) : (
                  <>
                    REVIEW
                    <br />
                    TRACE
                  </>
                )
              ) : (
                <>
                  MEASURING
                  <br />
                  NOW
                </>
              )}
            </span>
          </div>
          <MetricGrid items={profileMetrics(snapshot, report)} label="真实性能摘要" />
          <div className="budget-ruler" aria-label="16.7 毫秒 React render 帧预算使用情况">
            <span style={{ width: `${Math.min(100, (reactP95 / 16.7) * 100)}%` }}>
              React render p95 {formatProfileMs(reactP95)}
            </span>
            <i>16.7 ms frame</i>
          </div>
        </div>
        <section className="trace-panel">
          <header>
            <div>
              <p className="eyebrow eyebrow--dark">MEASURED EVENT LOG</p>
              <h2>最近一次 Replay 的 Profiler commits</h2>
            </div>
            <span>{report?.events.length ?? 0} measured</span>
          </header>
          <TraceTimeline events={report?.events ?? []} />
          <Profiler id="stream-output" onRender={onRender}>
            <div className="profile-output" aria-label="被测流式输出">
              {answer ? (
                <RenderDocumentView
                  document={answer.document}
                  final={snapshot?.phase === 'settled'}
                  heavyArtifacts={snapshot?.heavyArtifacts}
                  partId={answer.id}
                  revision={snapshot?.revision}
                  runId={snapshot?.runId}
                />
              ) : (
                <p>等待第一个可见提交…</p>
              )}
            </div>
          </Profiler>
        </section>
      </section>
      <p className="profile-method-note">
        React 使用正常订阅调度；production bundle 切到 profiling renderer，并记录 Profiler
        actualDuration（render/reconcile）。CV/RME95 来自 5 次 Replay 的总 render work；N/A
        表示浏览器能力不可用。
      </p>
      <section className="reading-guide">
        <h2>如何读这张图</h2>
        <div>
          <p>
            <span>01</span>
            <strong>先问延迟来自哪里</strong> raw→visible 是引擎时钟的真实到达样本。
          </p>
          <p>
            <span>02</span>
            <strong>再看工作是否重复</strong> parse work 是累计 preview parsed code units。
          </p>
          <p>
            <span>03</span>
            <strong>最后检查主线程</strong> React render p95 与 long task 分别描述 reconcile
            工作和阻塞。
          </p>
        </div>
      </section>
    </div>
  )
}
