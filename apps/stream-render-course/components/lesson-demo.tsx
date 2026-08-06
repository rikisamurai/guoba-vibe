/* oxlint-disable react/iframe-missing-sandbox -- the configured Lab is cross-origin and messages are verified by origin and window */
import { LESSON_DEMOS, isDemoPresetPair } from '@stream-render/contract'
import type { DemoReport, LessonDemoId, LessonPresetId } from '@stream-render/contract'
import { useEffect, useRef, useState } from 'react'

import './lesson-demo.css'
import { acceptDemoReport, createDemoUrls } from './lesson-demo-model'

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

  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [state, setState] = useState<DemoState>({ kind: 'waiting' })
  const [listeningFor, setListeningFor] = useState<string>()
  const urls = createDemoUrls(demoId, presetId)
  const listenerKey = `${demoId}@${urls.origin}`

  useEffect(() => {
    setState({ kind: 'waiting' })
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
    setListeningFor(listenerKey)
    return () => window.removeEventListener('message', receive)
  }, [demoId, listenerKey, urls.origin])

  if (import.meta.env.SSG_MD) {
    return (
      <p>
        本节包含交互实验：<a href={urls.fullLab}>{LESSON_DEMOS[demoId].label}</a>。
      </p>
    )
  }

  const settled = state.kind === 'settled' ? state.report : undefined
  return (
    <section className="lesson-demo" aria-label={`${LESSON_DEMOS[demoId].label}交互实验`}>
      <header className="lesson-demo__header">
        <div>
          <span>LIVE LAB</span>
          <strong>{LESSON_DEMOS[demoId].label}</strong>
        </div>
        <output data-state={state.kind}>{statusText(state)}</output>
      </header>
      {listeningFor === listenerKey ? (
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
            <p>运行结束后，这里会核对本章 invariant。</p>
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
          {passed}/{report.checkpoints.length} checks
        </strong>{' '}
        · {report.outcome} · run {report.runId}
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
  if (state.kind === 'waiting') return '等待 Lab'
  if (state.kind === 'ready') return '可以运行'
  return state.report.outcome
}
