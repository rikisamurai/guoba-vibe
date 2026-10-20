import type { HighlightToken } from '../heavy/types'
import type { RenderDocument } from '../markdown/types'

export interface ProjectionIdentity {
  runId: string
  blockId: string
  revision: number
}

export type ProjectionOperation =
  | { kind: 'markdown'; mode: 'M2' | 'M3' }
  | { kind: 'highlight'; language?: string | null; final?: boolean }

export interface ProjectionTask extends ProjectionIdentity {
  raw: string
  operation: ProjectionOperation
}

export type ProjectionValue =
  | { kind: 'markdown'; document: RenderDocument }
  | { kind: 'highlight'; tokens: readonly HighlightToken[] }

export interface ProjectionResult {
  identity: ProjectionIdentity
  value: ProjectionValue
  via: 'inline' | 'worker' | 'inline-failover'
  sourceMode: 'full' | 'suffix'
}

export interface Projector {
  prewarm(signal?: AbortSignal): Promise<void>
  project(task: ProjectionTask, signal?: AbortSignal): Promise<ProjectionResult>
  dispose(): void
}

export type WorkerProjectionCommand =
  | { type: 'prewarm' }
  | {
      type: 'project'
      identity: ProjectionIdentity
      operation: ProjectionOperation
      sessionKey: string
      sourceMode: 'full' | 'suffix'
      source: string
    }

export type WorkerProjectionReply =
  | { type: 'ready' }
  | { type: 'projected'; identity: ProjectionIdentity; value: ProjectionValue }

export interface ProjectionPort {
  request(command: WorkerProjectionCommand, signal?: AbortSignal): Promise<WorkerProjectionReply>
  dispose(): void
}
