import type { ProjectionIdentity } from './types'

export class StaleProjectionError extends Error {
  constructor(readonly identity: ProjectionIdentity) {
    super(`Stale projection ${identity.runId}/${identity.blockId}@${identity.revision}`)
    this.name = 'StaleProjectionError'
  }
}

export class ProjectionDisposedError extends Error {
  constructor() {
    super('Projector is disposed')
    this.name = 'ProjectionDisposedError'
  }
}

export function abortError(reason?: unknown): DOMException {
  return new DOMException(typeof reason === 'string' ? reason : 'Projection aborted', 'AbortError')
}
