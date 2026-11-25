import type { RenderPart } from '../engine/types'
import type { RenderBlock, RenderNode } from '../markdown/types'
import type { HeavyJobSpec, HeavyKind } from './types'

interface RevisionState {
  fingerprint: string
  revision: number
}

function kindOf(node: RenderNode): HeavyKind | null {
  if (node.type === 'code') return node.lang === 'mermaid' ? 'mermaid' : 'code'
  if (node.type === 'math' || node.type === 'inlineMath') return 'math'
  return null
}

function fingerprint(node: RenderNode, kind: HeavyKind): string {
  return JSON.stringify([kind, node.value ?? '', node.lang ?? '', node.type === 'math'])
}

export class HeavyPlanBuilder {
  private readonly revisions = new Map<string, RevisionState>()

  build(runId: string, parts: readonly RenderPart[]): HeavyJobSpec[] {
    const jobs: HeavyJobSpec[] = []
    for (const part of parts) {
      for (const block of part.document.blocks) {
        this.visit(runId, part.id, block, block.node, 'root', jobs)
      }
    }
    return jobs
  }

  private visit(
    runId: string,
    partId: string,
    block: RenderBlock,
    node: RenderNode,
    path: string,
    jobs: HeavyJobSpec[],
  ): void {
    const kind = kindOf(node)
    if (kind) jobs.push(this.toJob(runId, partId, block, node, path, kind))
    for (const [index, child] of (node.children ?? []).entries()) {
      this.visit(runId, partId, block, child, `${path}.${index}`, jobs)
    }
  }

  private toJob(
    runId: string,
    partId: string,
    block: RenderBlock,
    node: RenderNode,
    path: string,
    kind: HeavyKind,
  ): HeavyJobSpec {
    const key = heavyJobKey(partId, block.id, path)
    const nextFingerprint = fingerprint(node, kind)
    const prior = this.revisions.get(key)
    const revision =
      prior?.fingerprint === nextFingerprint ? prior.revision : (prior?.revision ?? 0) + 1
    this.revisions.set(key, { fingerprint: nextFingerprint, revision })
    return {
      key,
      runId,
      blockId: key,
      revision,
      kind,
      source: node.value ?? '',
      ...(kind === 'code' ? { language: node.lang } : {}),
      ...(kind === 'math' ? { display: node.type === 'math' } : {}),
    }
  }
}

export function heavyJobKey(partId: string, blockId: string, path: string): string {
  return `${partId}/${blockId}/${path}`
}

export function heavyArtifactMatches(job: HeavyJobSpec, artifact: { job: HeavyJobSpec }): boolean {
  return (
    artifact.job.key === job.key &&
    artifact.job.runId === job.runId &&
    artifact.job.revision === job.revision
  )
}
