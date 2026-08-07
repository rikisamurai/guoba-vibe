import type { CheckpointResult, LessonDemoId } from '@stream-render/contract'

import { runCoreFoundationDemo } from './foundation-demo-core-runs'
import { runProtocolFoundationDemo } from './foundation-demo-protocol-runs'

export const FOUNDATION_DEMOS = ['response', 'replay', 'm0', 'utf8', 'sse', 'chat-adapter'] as const

export type FoundationDemoId = (typeof FOUNDATION_DEMOS)[number]

export interface FoundationFrame {
  arrival: string
  event: string
  note: string
  visible: string
  wire: string
}

export interface FoundationTrace {
  actualEventCount: number
  actualProof: string
  demoId: FoundationDemoId
  expectedEventCount: number
  expectedProof: string
  expectedVisible: string
  frames: readonly FoundationFrame[]
  proofLabel: string
  terminalObserved: boolean
}

export function isFoundationDemo(demoId: LessonDemoId): demoId is FoundationDemoId {
  return FOUNDATION_DEMOS.some((candidate) => candidate === demoId)
}

export function runFoundationDemo(demoId: FoundationDemoId): FoundationTrace {
  if (demoId === 'response' || demoId === 'replay' || demoId === 'm0') {
    return runCoreFoundationDemo(demoId)
  }
  return runProtocolFoundationDemo(demoId)
}

export function foundationCheckpoints(
  trace: FoundationTrace,
  finalFrame: FoundationFrame,
): readonly CheckpointResult[] {
  const reachedActualEnd = finalFrame === trace.frames.at(-1)
  return [
    {
      id: 'trace-finished',
      label: '真实 fixture 已执行到可证明的终点',
      passed: reachedActualEnd && trace.terminalObserved,
    },
    {
      id: 'solution-output',
      label: trace.proofLabel,
      passed:
        reachedActualEnd &&
        trace.actualEventCount === trace.expectedEventCount &&
        trace.actualProof === trace.expectedProof &&
        finalFrame.visible === trace.expectedVisible,
    },
  ]
}
