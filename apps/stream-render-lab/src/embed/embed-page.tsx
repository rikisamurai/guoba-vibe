import {
  LESSON_DEMOS,
  isDemoPresetPair,
  isLessonDemoId,
  type CheckpointResult,
  type DemoReport,
  type LessonDemoId,
} from '@stream-render/contract'
import { useCallback, useEffect, useMemo } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'

import { LabWorkbench } from '../lab/lab-workbench'
import type { LabSettledReport } from '../lab/types'

export default function EmbedPage() {
  const { demoId: rawDemoId } = useParams()
  const [search] = useSearchParams()
  const targetOrigin = useMemo(parentOrigin, [])
  const demoId = isLessonDemoId(rawDemoId) ? rawDemoId : null
  const requestedPreset = search.get('preset')
  const presetId =
    demoId && isDemoPresetPair(demoId, requestedPreset)
      ? requestedPreset
      : demoId
        ? LESSON_DEMOS[demoId].defaultPreset
        : null

  const postReport = useCallback(
    (report: DemoReport) => {
      if (targetOrigin && window.parent !== window) window.parent.postMessage(report, targetOrigin)
    },
    [targetOrigin],
  )

  useEffect(() => {
    if (demoId) postReport({ version: 1, kind: 'ready', demoId })
  }, [demoId, postReport])

  if (!demoId || !presetId) {
    return (
      <main className="embed-error">
        <h1>未知课程实验</h1>
        <p>请从课程页重新打开这个 Demo。</p>
      </main>
    )
  }

  return (
    <main className="embed-page">
      <header>
        <div>
          <span>LESSON DEMO</span>
          <strong>{LESSON_DEMOS[demoId].label}</strong>
        </div>
        <Link to={`/lab?demo=${demoId}&preset=${presetId}`}>打开完整实验台 ↗</Link>
      </header>
      <LabWorkbench
        embedded
        initialPreset={presetId}
        onSettled={(report) =>
          postReport({
            version: 1,
            kind: 'run-settled',
            demoId,
            runId: report.runId,
            outcome: report.outcome,
            checkpoints: checkpoints(demoId, report),
          })
        }
      />
    </main>
  )
}

function checkpoints(demoId: LessonDemoId, report: LabSettledReport): readonly CheckpointResult[] {
  const snapshots = Object.values(report.snapshots)
  const raw = snapshots.map(
    (snapshot) => snapshot?.parts.find((part) => part.kind === 'answer')?.raw,
  )
  const common: CheckpointResult[] = [
    {
      id: 'settled-once',
      label: '两条 pipeline 都进入 settled',
      passed:
        snapshots.length === 2 && snapshots.every((snapshot) => snapshot?.phase === 'settled'),
    },
    {
      id: 'raw-equivalent',
      label: '两条 pipeline 接受完全相同的 raw',
      passed: raw.length === 2 && raw[0] !== undefined && raw[0] === raw[1],
    },
  ]
  if (demoId === 'sse') return [...common, ...sseCheckpoints(report)]
  return [...common, ...renderCheckpoints(report, demoId === 'quick-start' ? 'M4' : 'M1')]
}

function renderCheckpoints(report: LabSettledReport, candidate: 'M1' | 'M4'): CheckpointResult[] {
  const baseline = report.snapshots.M0
  const challenger = report.snapshots[candidate]
  const baselinePart = baseline?.parts.find((part) => part.kind === 'answer')
  const challengerPart = challenger?.parts.find((part) => part.kind === 'answer')
  return [
    {
      id: 'final-ir-equivalent',
      label: `M0 与 ${candidate} 的终态 Render IR 等价`,
      passed:
        baselinePart !== undefined &&
        challengerPart !== undefined &&
        JSON.stringify(baselinePart.document) === JSON.stringify(challengerPart.document),
    },
    {
      id: 'commit-reduction',
      label: `${candidate} 的 commit 数少于 M0`,
      passed:
        baseline !== undefined &&
        challenger !== undefined &&
        challenger.metrics.commits < baseline.metrics.commits,
    },
  ]
}

function sseCheckpoints(report: LabSettledReport): CheckpointResult[] {
  const wirePrefix = report.trace.wire
    .flatMap((chunk) => chunk.hex.split(' '))
    .slice(0, 3)
    .join(' ')
  const decoded = report.trace.decoded.map((chunk) => chunk.text).join('')
  return [
    {
      id: 'bom-safe-utf8',
      label: 'BOM bytes 被 UTF-8 decoder 正确消费',
      passed: wirePrefix === 'ef bb bf' && !decoded.startsWith('\uFEFF'),
    },
    {
      id: 'retry-control',
      label: 'SSE retry control 被 parser 识别',
      passed: report.trace.sse.some(
        (event) => 'control' in event && event.control === 'retry' && event.retry === 1200,
      ),
    },
    {
      id: 'provider-terminal',
      label: 'provider adapter 产出 completed response.end',
      passed: report.trace.events.some(
        ({ event }) => event.type === 'response.end' && event.outcome.kind === 'completed',
      ),
    },
  ]
}

function parentOrigin(): string | null {
  if (document.referrer === '') return null
  try {
    const referrerOrigin = new URL(document.referrer).origin
    const configuredOrigin = import.meta.env.VITE_COURSE_ORIGIN ?? 'http://localhost:5173'
    return referrerOrigin === new URL(configuredOrigin).origin ? referrerOrigin : null
  } catch {
    return null
  }
}
