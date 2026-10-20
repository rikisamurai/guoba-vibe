import { parseCanonical } from '../markdown'
import type { RenderDocument } from '../markdown/types'
import type { PartKind } from '../protocol/types'
import type { RenderPart } from './types'

export interface MutablePart {
  id: string
  kind: PartKind
  chunks: string[]
  raw: string
  visibleEnd: number
  document: RenderDocument
  ended: boolean
  arrivals: Array<{ end: number; at: number }>
}

export function createMutablePart(id: string, kind: PartKind): MutablePart {
  return {
    id,
    kind,
    chunks: [],
    raw: '',
    visibleEnd: 0,
    document: parseCanonical(''),
    ended: false,
    arrivals: [],
  }
}

export function toRenderPart(part: MutablePart): RenderPart {
  return {
    id: part.id,
    kind: part.kind,
    raw: part.raw,
    visible: part.raw.slice(0, part.visibleEnd),
    document: part.document,
    ended: part.ended,
  }
}
