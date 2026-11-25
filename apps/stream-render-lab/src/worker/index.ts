export { ProjectionDisposedError, StaleProjectionError } from './errors'
export {
  createBrowserProjectionPort,
  type BrowserWorkerLike,
  type WorkerWireMessage,
  type WorkerWireReply,
} from './browser-port'
export { createBrowserWorkerProjector } from './browser-projector'
export {
  createInlineProjector,
  type InlineHighlighter,
  type InlineHighlighterFactory,
} from './inline-projector'
export { createWorkerProjector } from './worker-projector'
export { createWorkerRuntime, type WorkerProjectionRuntime } from './worker-runtime'
export type {
  ProjectionIdentity,
  ProjectionOperation,
  ProjectionPort,
  ProjectionResult,
  ProjectionTask,
  ProjectionValue,
  Projector,
  WorkerProjectionCommand,
  WorkerProjectionReply,
} from './types'
