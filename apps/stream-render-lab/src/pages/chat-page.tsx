import { useEffect, useState } from 'react'

import { LiveChatPanel } from '../components/live-chat-panel'
import { MetricGrid, type MetricItem } from '../components/metric-grid'
import { PageHero } from '../components/page-hero'
import type { RenderSnapshot } from '../engine/types'

interface CapabilityStatus {
  liveEnabled: boolean
}

export default function ChatPage() {
  const [snapshot, setSnapshot] = useState<RenderSnapshot | null>(null)
  const [capability, setCapability] = useState<CapabilityStatus | null>(null)
  useEffect(() => {
    void fetch('/api/capabilities')
      .then((response) => response.json())
      .then((value: CapabilityStatus) => setCapability(value))
      .catch(() => setCapability({ liveEnabled: false }))
  }, [])
  const enabled = capability?.liveEnabled === true
  return (
    <div className="page chat-page">
      <PageHero
        compact
        eyebrow="LIVE SURFACE · LOCAL OPT-IN"
        title="真实聊天，保留实验仪表"
        lead="真实 API 只是另一种 source。它与确定性 Replay 共用同一条渲染管线，但密钥、费用和供应商波动不会污染基础实验。"
        aside={
          <div className="connection-card">
            <i />
            <span>LIVE API STATUS</span>
            <strong>{enabled ? 'ENABLED' : capability ? 'DISABLED' : 'CHECKING'}</strong>
            <small>{enabled ? 'deployment auth is separate' : 'deterministic replay only'}</small>
          </div>
        }
      />
      <div className="chat-layout">
        <LiveChatPanel onSnapshot={setSnapshot} />
        <details className="chat-inspector">
          <summary>MESSAGE INSPECTOR · {snapshot?.phase ?? 'idle'}</summary>
          <header>
            <p className="eyebrow eyebrow--dark">REAL RUN STATE</p>
            <h2>当前回答</h2>
          </header>
          <dl>
            <div>
              <dt>source</dt>
              <dd>/api/chat byte passthrough</dd>
            </div>
            <div>
              <dt>renderer</dt>
              <dd>production / M4</dd>
            </div>
            <div>
              <dt>terminal</dt>
              <dd>{snapshot?.outcome?.kind ?? 'provider proof required'}</dd>
            </div>
            <div>
              <dt>revision</dt>
              <dd>{snapshot?.revision ?? 0}</dd>
            </div>
          </dl>
          <MetricGrid items={chatMetrics(snapshot)} label="真实聊天运行指标" />
          <p className="inspector-note">面板默认折叠；所有数值来自当前或最近一次 run snapshot。</p>
        </details>
      </div>
    </div>
  )
}

function chatMetrics(snapshot: RenderSnapshot | null): MetricItem[] {
  return [
    {
      label: 'RAW → VISIBLE P95',
      value: `${(snapshot?.metrics.rawToVisibleP95Ms ?? 0).toFixed(1)} ms`,
      note: `${snapshot?.metrics.rawToVisibleSamples ?? 0} accepted deltas`,
      tone: 'signal',
    },
    {
      label: 'COMMITS',
      value: `${snapshot?.metrics.commits ?? 0}`,
      note: `${snapshot?.metrics.previewParsePasses ?? 0} preview parses`,
    },
    {
      label: 'PARSE WORK',
      value: `${snapshot?.metrics.previewParsedCodeUnits ?? 0}`,
      note: 'UTF-16 code units',
    },
    {
      label: 'HEAVY JOBS',
      value: `${snapshot?.heavyMetrics.completed ?? 0}/${snapshot?.heavyMetrics.attempts ?? 0}`,
      note: `${snapshot?.heavyMetrics.failed ?? 0} failed`,
    },
  ]
}
