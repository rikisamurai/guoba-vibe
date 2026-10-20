import type { LabTrace } from './types'

export const EMPTY_TRACE: LabTrace = { wire: [], decoded: [], lines: [], sse: [], events: [] }

export interface MutableTrace {
  wire: LabTrace['wire'][number][]
  decoded: LabTrace['decoded'][number][]
  lines: string[]
  sse: LabTrace['sse'][number][]
  events: LabTrace['events'][number][]
}

export function mutableTrace(): MutableTrace {
  return { wire: [], decoded: [], lines: [], sse: [], events: [] }
}

export function freezeTrace(trace: MutableTrace): LabTrace {
  return {
    wire: [...trace.wire],
    decoded: [...trace.decoded],
    lines: [...trace.lines],
    sse: [...trace.sse],
    events: [...trace.events],
  }
}
