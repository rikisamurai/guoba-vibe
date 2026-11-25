import { memo, useMemo } from 'react'

import type { HeavyArtifact } from '../heavy/types'
import type { RenderBlock, RenderDocument } from '../markdown/types'
import { renderNode } from './render-node'

interface RenderDocumentViewProps {
  document: RenderDocument
  runId?: string
  revision?: number
  final?: boolean
  partId?: string
  heavyArtifacts?: readonly HeavyArtifact[]
}

interface BlockViewProps {
  block: RenderBlock
  runId: string
  revision: number
  final: boolean
  partId: string
  artifacts: ReadonlyMap<string, HeavyArtifact>
}

const NO_ARTIFACTS: readonly HeavyArtifact[] = []

export function sameBlockArtifacts(
  before: ReadonlyMap<string, HeavyArtifact>,
  after: ReadonlyMap<string, HeavyArtifact>,
  partId: string,
  blockId: string,
): boolean {
  const prefix = `${partId}/${blockId}/`
  for (const [key, artifact] of before) {
    if (key.startsWith(prefix) && after.get(key) !== artifact) return false
  }
  for (const [key, artifact] of after) {
    if (key.startsWith(prefix) && before.get(key) !== artifact) return false
  }
  return true
}

const BlockView = memo(
  function BlockView(props: BlockViewProps) {
    const { block, runId, revision, final, partId, artifacts } = props
    return renderNode(block.node, {
      runId,
      blockId: block.id,
      revision,
      final,
      partId,
      artifacts,
    })
  },
  (before, after) =>
    before.block === after.block &&
    before.final === after.final &&
    before.partId === after.partId &&
    sameBlockArtifacts(before.artifacts, after.artifacts, before.partId, before.block.id),
)

export function RenderDocumentView({
  document,
  runId = 'static',
  revision = 0,
  final = true,
  partId = 'static',
  heavyArtifacts = NO_ARTIFACTS,
}: RenderDocumentViewProps) {
  const artifacts = useMemo(
    () => new Map(heavyArtifacts.map((artifact) => [artifact.job.key, artifact])),
    [heavyArtifacts],
  )
  return (
    <div className="render-document" data-strategy={document.work.strategy}>
      {document.blocks.map((block) => (
        <BlockView
          block={block}
          final={final}
          key={block.id}
          revision={revision}
          runId={runId}
          partId={partId}
          artifacts={artifacts}
        />
      ))}
    </div>
  )
}
