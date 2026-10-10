import { ProjectionDisposedError, StaleProjectionError } from './errors'
import type { ProjectionIdentity } from './types'

function keyOf(identity: ProjectionIdentity): string {
  return `${identity.runId}\u0000${identity.blockId}`
}

function sameIdentity(left: ProjectionIdentity, right: ProjectionIdentity): boolean {
  return (
    left.runId === right.runId && left.blockId === right.blockId && left.revision === right.revision
  )
}

export class ProjectionGuard {
  private readonly latest = new Map<string, ProjectionIdentity>()
  private disposed = false

  begin(identity: ProjectionIdentity): void {
    if (this.disposed) throw new ProjectionDisposedError()
    this.latest.set(keyOf(identity), identity)
  }

  assertCurrent(identity: ProjectionIdentity): void {
    if (this.disposed) throw new ProjectionDisposedError()
    const latest = this.latest.get(keyOf(identity))
    if (!latest || !sameIdentity(latest, identity)) throw new StaleProjectionError(identity)
  }

  dispose(): void {
    this.disposed = true
    this.latest.clear()
  }
}

export function identityOf(identity: ProjectionIdentity): ProjectionIdentity {
  return {
    runId: identity.runId,
    blockId: identity.blockId,
    revision: identity.revision,
  }
}

export function sameProjectionIdentity(
  left: ProjectionIdentity,
  right: ProjectionIdentity,
): boolean {
  return sameIdentity(left, right)
}
