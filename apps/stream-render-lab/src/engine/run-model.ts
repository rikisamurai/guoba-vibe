import type { HeavyArtifact, HeavyMetrics } from '../heavy/types'
import { parseCanonical, parsePreview } from '../markdown'
import type { RenderDocument } from '../markdown/types'
import type { PartDelta, PartKind, RunOutcome } from '../protocol/types'
import { EMPTY_HEAVY_METRICS, EMPTY_RUN_METRICS, percentile } from './metrics'
import type {
  RenderDiagnostic,
  RenderPart,
  RenderProfile,
  RenderSnapshot,
  RevealMode,
  RunPhase,
} from './types'
import { advanceVisible } from './visible-cursor'

interface MutablePart {
  id: string
  kind: PartKind
  chunks: string[]
  raw: string
  visibleEnd: number
  document: RenderDocument
  ended: boolean
  arrivals: Array<{ end: number; at: number }>
}

export class RunModel {
  private revision = 0
  private throughInternalSeq: number | null = null
  private parts: MutablePart[] = []
  private diagnostics: RenderDiagnostic[] = []
  private metrics = { ...EMPTY_RUN_METRICS }
  private rawToVisible: number[] = []
  private heavyArtifacts = new Map<string, HeavyArtifact>()
  private heavyMetrics = { ...EMPTY_HEAVY_METRICS }

  constructor(
    readonly runId: string,
    private readonly profile: RenderProfile,
  ) {}

  noteEvent(internalSeq: number): void {
    this.throughInternalSeq = internalSeq
    this.metrics.internalEvents += 1
  }

  startPart(id: string, kind: PartKind): boolean {
    if (this.parts.some((part) => part.id === id)) return false
    this.parts.push({
      id,
      kind,
      chunks: [],
      raw: '',
      visibleEnd: 0,
      document: parseCanonical(''),
      ended: false,
      arrivals: [],
    })
    return true
  }

  appendPart(id: string, delta: PartDelta, arrivedAt: number): boolean {
    const part = this.parts.find((candidate) => candidate.id === id)
    if (!part || part.ended) return false
    const text =
      delta.kind === 'text' ? delta.text : delta.kind === 'json' ? delta.fragment : delta.value
    part.chunks.push(text)
    part.raw += text
    part.arrivals.push({ end: part.raw.length, at: arrivedAt })
    this.updateBacklog()
    return true
  }

  endPart(id: string): boolean {
    const part = this.parts.find((candidate) => candidate.id === id)
    if (!part || part.ended) return false
    part.ended = true
    return true
  }

  hasActiveParts(): boolean {
    return this.parts.some((part) => !part.ended)
  }

  endAllParts(): void {
    this.parts.forEach((part) => {
      part.ended = true
    })
  }

  addDiagnostic(code: string, message: string): void {
    this.diagnostics.push({ code, message })
  }

  hasBacklog(): boolean {
    return this.parts.some((part) => part.visibleEnd < part.raw.length)
  }

  commitPreview(reveal: RevealMode, visibleAt: number): void {
    for (const part of this.parts) {
      const nextVisibleEnd =
        reveal === 'direct' ? part.raw.length : advanceVisible(part.raw, part.visibleEnd)
      if (nextVisibleEnd === part.visibleEnd) continue
      part.visibleEnd = nextVisibleEnd
      const visible = part.raw.slice(0, part.visibleEnd)
      const previous = part.document
      if (this.profile === 'M0' || this.profile === 'M1') {
        part.document = parseCanonical(visible)
      } else {
        part.document = parsePreview(visible, {
          mode: this.profile === 'M2' ? 'M2' : 'M3',
          previous,
        })
      }
      this.recordVisible(part, visibleAt)
      this.recordPreview(part.document)
    }
    this.revision += 1
    this.metrics.commits += 1
    this.updateBacklog()
  }

  commitCanonical(visibleAt: number): void {
    for (const part of this.parts) {
      part.visibleEnd = part.raw.length
      part.document = parseCanonical(part.raw)
      this.recordVisible(part, visibleAt)
      this.metrics.canonicalParsePasses += 1
    }
    this.revision += 1
    this.metrics.commits += 1
    this.updateBacklog()
  }

  recordParseDuration(kind: 'preview' | 'canonical', durationMs: number): void {
    const key = kind === 'preview' ? 'previewParseDurationMs' : 'canonicalParseDurationMs'
    this.metrics[key] += Math.max(0, durationMs)
  }

  commitHeavy(artifact: HeavyArtifact): void {
    this.heavyArtifacts.set(artifact.job.key, artifact)
    if (artifact.status === 'failed') {
      this.addHeavyFailure(artifact)
    }
    this.revision += 1
  }

  replaceHeavy(artifacts: readonly HeavyArtifact[], metrics: HeavyMetrics): void {
    this.heavyArtifacts = new Map(artifacts.map((artifact) => [artifact.job.key, artifact]))
    this.heavyMetrics = { ...metrics }
    for (const artifact of artifacts) {
      if (artifact.status === 'failed') this.addHeavyFailure(artifact)
    }
  }

  setHeavyMetrics(metrics: HeavyMetrics): void {
    this.heavyMetrics = { ...metrics }
  }

  snapshot(phase: RunPhase, outcome?: RunOutcome): RenderSnapshot {
    return {
      runId: this.runId,
      revision: this.revision,
      phase,
      ...(outcome ? { outcome } : {}),
      throughInternalSeq: this.throughInternalSeq,
      parts: this.parts.map(toRenderPart),
      metrics: { ...this.metrics },
      diagnostics: [...this.diagnostics],
      heavyArtifacts: [...this.heavyArtifacts.values()],
      heavyMetrics: { ...this.heavyMetrics },
    }
  }

  private recordPreview(document: RenderDocument): void {
    this.metrics.previewParsePasses += 1
    this.metrics.previewParsedCodeUnits += document.work.parsedCodeUnits
    if (document.work.strategy === 'full-fallback') this.metrics.fullFallbacks += 1
    for (const item of document.diagnostics) {
      this.diagnostics.push({ code: item.code, message: item.code, offset: item.offset })
    }
  }

  private addHeavyFailure(artifact: Extract<HeavyArtifact, { status: 'failed' }>): void {
    const message = `${artifact.job.kind}: ${artifact.error}`
    if (this.diagnostics.some((item) => item.code === 'heavy_failed' && item.message === message))
      return
    this.diagnostics.push({ code: 'heavy_failed', message })
  }

  private updateBacklog(): void {
    this.metrics.backlogCodeUnits = this.parts.reduce(
      (total, part) => total + part.raw.length - part.visibleEnd,
      0,
    )
  }

  private recordVisible(part: MutablePart, visibleAt: number): void {
    const accepted = part.arrivals.filter((arrival) => arrival.end <= part.visibleEnd)
    part.arrivals = part.arrivals.slice(accepted.length)
    this.rawToVisible.push(...accepted.map((arrival) => Math.max(0, visibleAt - arrival.at)))
    const sorted = this.rawToVisible.toSorted((left, right) => left - right)
    this.metrics.rawToVisibleSamples = sorted.length
    this.metrics.rawToVisibleP50Ms = percentile(sorted, 0.5)
    this.metrics.rawToVisibleP95Ms = percentile(sorted, 0.95)
  }
}

function toRenderPart(part: MutablePart): RenderPart {
  return {
    id: part.id,
    kind: part.kind,
    raw: part.raw,
    visible: part.raw.slice(0, part.visibleEnd),
    document: part.document,
    ended: part.ended,
  }
}
