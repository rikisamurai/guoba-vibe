import type { RenderProfile, RenderSnapshot } from '../engine/types'
import { RenderDocumentView } from '../rendering/render-document'

interface Props {
  profile: RenderProfile
  showDiagnostics: boolean
  snapshot: RenderSnapshot | undefined
}

export function StreamingPipelineOutput({ profile, showDiagnostics, snapshot }: Props) {
  const answer = snapshot?.parts.find((part) => part.kind === 'answer')
  const final = snapshot?.phase === 'settled'
  return (
    <article className="workbench-output" data-profile={profile}>
      <div className="output-heading">
        <div>
          <span>PIPELINE</span>
          <strong>
            {profile} · {profile === 'M0' ? 'NAIVE' : 'ADVANCED'}
          </strong>
        </div>
        <code>
          {snapshot?.phase ?? 'ready'} / {snapshot?.outcome?.kind ?? 'pending'} / #
          {snapshot?.revision ?? 0}
        </code>
      </div>
      <div className="pipeline-metrics">
        <span>
          engine commits <b>{snapshot?.metrics.commits ?? 0}</b>
        </span>
        <span>
          parse work <b>{snapshot?.metrics.previewParsedCodeUnits ?? 0}</b>
        </span>
        <span>
          p95 <b>{(snapshot?.metrics.rawToVisibleP95Ms ?? 0).toFixed(1)} ms</b>
        </span>
        <span>
          heavy <b>{snapshot?.heavyMetrics.attempts ?? 0}</b>
        </span>
      </div>
      {showDiagnostics ? (
        <p className="pipeline-diagnostics">
          diagnostics · {snapshot?.diagnostics.map(({ code }) => code).join(', ') || 'none'}
        </p>
      ) : null}
      <div className="sample-answer" aria-live={final ? 'polite' : 'off'}>
        {answer ? (
          <RenderDocumentView
            document={answer.document}
            final={final}
            heavyArtifacts={snapshot?.heavyArtifacts}
            partId={answer.id}
            revision={snapshot?.revision}
            runId={snapshot?.runId}
          />
        ) : (
          <p>播放后，两侧接收相同时间点的相同 delta。</p>
        )}
      </div>
    </article>
  )
}
