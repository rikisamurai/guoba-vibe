import type { LessonDemoId } from '@stream-render/contract'

import { BatchDemo } from './batch-demo'
import { ByteDemo } from './byte-demo'
import { IntroDemo } from './intro-demo'
import { SseDemo } from './sse-demo'
import type { BeginnerCallbacks } from './types'

import './beginner.css'

export const BEGINNER_IDS = ['first-look', 'byte-lab', 'sse-lab', 'batch-lab'] as const
export type BeginnerId = (typeof BEGINNER_IDS)[number]

export function isBeginnerDemo(id: LessonDemoId): id is BeginnerId {
  return BEGINNER_IDS.some((value) => value === id)
}

export function BeginnerDemo({ demoId, ...callbacks }: BeginnerCallbacks & { demoId: BeginnerId }) {
  if (demoId === 'first-look') return <IntroDemo {...callbacks} />
  if (demoId === 'byte-lab') return <ByteDemo {...callbacks} />
  if (demoId === 'sse-lab') return <SseDemo {...callbacks} />
  return <BatchDemo {...callbacks} />
}
