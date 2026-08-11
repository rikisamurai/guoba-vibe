import {
  LESSON_DEMOS,
  isDemoPresetPair,
  isLessonDemoId,
  type DemoReport,
} from '@stream-render/contract'
import { useCallback, useEffect, useMemo } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'

import { LabWorkbench } from '../lab/lab-workbench'
import { QuickStartGuide } from '../lab/quick-start-guide'
import { labCheckpoints } from './embed-checkpoints'
import { FoundationDemo } from './foundation-demo'
import { isFoundationDemo } from './foundation-demo-model'

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
  const postReady = useCallback(() => {
    if (demoId) postReport({ version: 1, kind: 'ready', demoId })
  }, [demoId, postReport])

  useEffect(() => {
    postReady()
  }, [postReady])

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
          <span>课程实验</span>
          <strong>{LESSON_DEMOS[demoId].label}</strong>
        </div>
        <Link to={`/lab?demo=${demoId}&preset=${presetId}`}>打开完整实验台 ↗</Link>
      </header>
      {demoId === 'quick-start' ? (
        <QuickStartGuide
          onRestart={postReady}
          onSettled={(report) =>
            postReport({
              version: 1,
              kind: 'run-settled',
              demoId,
              runId: report.runId,
              outcome: report.outcome,
              checkpoints: labCheckpoints(demoId, report),
            })
          }
        />
      ) : isFoundationDemo(demoId) ? (
        <FoundationDemo
          demoId={demoId}
          onReset={postReady}
          onSettled={(checkpoints) =>
            postReport({
              version: 1,
              kind: 'run-settled',
              demoId,
              runId: crypto.randomUUID(),
              outcome: 'completed',
              checkpoints,
            })
          }
        />
      ) : (
        <LabWorkbench
          embedded
          initialPreset={presetId}
          onReset={postReady}
          onSettled={(report) =>
            postReport({
              version: 1,
              kind: 'run-settled',
              demoId,
              runId: report.runId,
              outcome: report.outcome,
              checkpoints: labCheckpoints(demoId, report),
            })
          }
        />
      )}
    </main>
  )
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
