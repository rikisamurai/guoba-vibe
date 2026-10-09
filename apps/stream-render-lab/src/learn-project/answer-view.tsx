import { memo, useMemo } from 'react'

import { parseCanonical } from '../markdown/canonical'
import { parsePreview } from '../markdown/preview'
import { RenderDocumentView } from '../rendering/render-document'

export const AnswerView = memo(function AnswerView({
  text,
  streaming,
}: {
  text: string
  streaming: boolean
}) {
  const document = useMemo(
    () => (streaming ? parsePreview(text, { mode: 'M2' }) : parseCanonical(text)),
    [text, streaming],
  )
  return (
    <>
      <RenderDocumentView document={document} final={!streaming} />
      <details>
        <summary>查看收到的原文</summary>
        <pre>{text}</pre>
      </details>
    </>
  )
})
