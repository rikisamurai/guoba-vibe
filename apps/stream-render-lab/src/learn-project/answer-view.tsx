import { memo } from 'react'

import type { RenderSnapshot } from '../engine/types'
import { RenderDocumentView } from '../rendering/render-document'

export const AnswerView = memo(function AnswerView({
  text,
  snapshot,
}: {
  text: string
  snapshot?: RenderSnapshot
}) {
  return (
    <>
      {snapshot?.parts.map((part) => (
        <RenderDocumentView
          key={part.id}
          document={part.document}
          final={snapshot.phase === 'settled'}
          runId={snapshot.runId}
          revision={snapshot.revision}
          partId={part.id}
          heavyArtifacts={snapshot.heavyArtifacts}
        />
      ))}
      <details>
        <summary>查看收到的原文</summary>
        <pre>{text}</pre>
      </details>
    </>
  )
})
