/* oxlint-disable react/iframe-missing-sandbox -- the configured Lab is cross-origin and messages are verified by origin and window */
import { LESSON_DEMOS, isDemoPresetPair } from '@stream-render/contract'
import type { DemoReport, LessonDemoId, LessonPresetId } from '@stream-render/contract'
import { useCallback, useRef, useState } from 'react'

import './lesson-demo.css'
import { acceptDemoReport, createDemoUrls, type DemoUrls } from './lesson-demo-model'

interface LessonDemoProps {
  demoId: LessonDemoId
  presetId: LessonPresetId
}

type DemoState =
  | { kind: 'waiting' }
  | { kind: 'ready' }
  | { kind: 'settled'; report: Extract<DemoReport, { kind: 'run-settled' }> }

export function LessonDemo({ demoId, presetId }: LessonDemoProps) {
  if (!isDemoPresetPair(demoId, presetId)) {
    throw new TypeError(`Preset ${String(presetId)} is not registered for demo ${demoId}`)
  }

  const urls = createDemoUrls(demoId, presetId)

  if (import.meta.env.SSG_MD) {
    return (
      <p>
        本节包含交互实验：<a href={urls.fullLab}>{LESSON_DEMOS[demoId].label}</a>。
      </p>
    )
  }

  return <LessonDemoFrame key={urls.embed} demoId={demoId} urls={urls} />
}

function LessonDemoFrame({ demoId, urls }: { demoId: LessonDemoId; urls: DemoUrls }) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [state, setState] = useState<DemoState>({ kind: 'waiting' })
  const [listening, setListening] = useState(false)
  const attachListener = useCallback(
    (element: HTMLElement | null) => {
      if (!element) return undefined
      const receive = (event: MessageEvent<unknown>) => {
        const report = acceptDemoReport(event, {
          demoId,
          origin: urls.origin,
          source: iframeRef.current?.contentWindow,
        })
        if (report?.kind === 'ready') setState({ kind: 'ready' })
        if (report?.kind === 'run-settled') setState({ kind: 'settled', report })
      }
      window.addEventListener('message', receive)
      // Register the listener before the iframe can post its ready report.
      setListening(true)
      return () => window.removeEventListener('message', receive)
    },
    [demoId, urls.origin],
  )

  const settled = state.kind === 'settled' ? state.report : undefined
  return (
    <section
      ref={attachListener}
      className="lesson-demo"
      data-beginner={['first-look', 'byte-lab', 'sse-lab', 'batch-lab'].includes(demoId)}
      data-compact={demoId !== 'quick-start' && demoId !== 'm1'}
      aria-label={`${LESSON_DEMOS[demoId].label}交互实验`}
    >
      <header className="lesson-demo__header">
        <div>
          <span>互动实验</span>
          <strong>{LESSON_DEMOS[demoId].label}</strong>
        </div>
        <output data-state={state.kind}>{statusText(state)}</output>
      </header>
      {listening ? (
        <iframe
          ref={iframeRef}
          className="lesson-demo__frame"
          loading="lazy"
          sandbox="allow-scripts allow-same-origin"
          src={urls.embed}
          title={`${LESSON_DEMOS[demoId].label}交互实验`}
        />
      ) : (
        <div aria-busy="true" className="lesson-demo__frame" />
      )}
      <footer className="lesson-demo__footer">
        <div aria-live="polite">
          {settled === undefined ? (
            <p>实验结束后，这里会核对本章检查项。</p>
          ) : (
            <CheckpointSummary report={settled} />
          )}
        </div>
        <a href={urls.fullLab} rel="noreferrer" target="_blank">
          打开完整实验台 <span aria-hidden="true">↗</span>
        </a>
      </footer>
    </section>
  )
}

function CheckpointSummary({ report }: { report: Extract<DemoReport, { kind: 'run-settled' }> }) {
  const passed = report.checkpoints.filter((checkpoint) => checkpoint.passed).length
  return (
    <div className="lesson-demo__checks">
      <p>
        <strong>
          已通过 {passed}/{report.checkpoints.length} 项检查
        </strong>
        {' · '}
        {outcomeText(report.outcome)}
      </p>
      <ul>
        {report.checkpoints.map((checkpoint) => (
          <li data-passed={checkpoint.passed} key={checkpoint.id}>
            <span aria-hidden="true">{checkpoint.passed ? '✓' : '×'}</span>
            <div>
              <strong>{checkpoint.label}</strong>
              {checkpoint.detail && <small>{checkpoint.detail}</small>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function statusText(state: DemoState): string {
  if (state.kind === 'waiting') return '正在加载实验'
  if (state.kind === 'ready') return '可以运行'
  return outcomeText(state.report.outcome)
}

function outcomeText(outcome: Extract<DemoReport, { kind: 'run-settled' }>['outcome']): string {
  const labels = {
    cancelled: '实验已停止',
    completed: '实验完成',
    failed: '实验失败',
    incomplete: '响应不完整',
    truncated: '响应被截断',
  } as const
  return labels[outcome]
}
