import type { RenderProfile, RenderSnapshot } from '../engine/types'

export type AbProfile = Exclude<RenderProfile, 'production'> | 'mine'
export type ProfileRole = 'baseline' | 'challenger'
export type ProfileFixture = 'mixed-markdown' | 'stable-paragraphs' | 'code-math'

export interface AbProfileConfig {
  baseline: AbProfile
  challenger: AbProfile
  cadenceMs: number
  chunkSize: number
  fixture: ProfileFixture
  repetitions: number
  textKChars: number
  warmups: number
}

export type ProfileLayer =
  | 'network'
  | 'decode'
  | 'sse'
  | 'provider'
  | 'parse'
  | 'react'
  | 'heavy'
  | 'long-task'

export interface ProfileTimelineSample {
  durationMs: number
  label: string
  layer: ProfileLayer
  startMs: number
}

export interface ProfileRunSample {
  elapsedMs: number
  firstVisibleMs: number | null
  index: number
  longTasks: number
  longTasksSupported: boolean
  profile: AbProfile
  resolvedProfile: RenderProfile
  role: ProfileRole
  reactCommits: number
  reactDurationMs: number
  snapshot: RenderSnapshot
  correctness: { raw: boolean; visible: boolean; canonical: boolean; completed: boolean }
  timeline: readonly ProfileTimelineSample[]
}

export interface ProfileAggregate {
  commits: number
  cvPercent: number | null
  longTasks: number
  longTasksSupported: boolean
  parseWork: number
  profile: AbProfile
  resolvedProfile: RenderProfile
  firstVisibleMs: number | null
  heavyJobs: number
  rawToVisibleP95Ms: number
  reactDurationP95Ms: number
}

export interface AbProfileReport {
  baseline: ProfileAggregate
  challenger: ProfileAggregate
  runs: readonly ProfileRunSample[]
  correctRuns: number
}

export const DEFAULT_AB_CONFIG: AbProfileConfig = {
  baseline: 'M0',
  challenger: 'mine',
  cadenceMs: 2,
  chunkSize: 96,
  fixture: 'mixed-markdown',
  repetitions: 5,
  textKChars: 16,
  warmups: 1,
}
