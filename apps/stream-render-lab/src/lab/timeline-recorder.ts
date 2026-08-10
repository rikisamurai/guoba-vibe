import type { EngineClock } from '../engine/clock'
import type { RenderProfile, RenderSnapshot } from '../engine/types'
import type {
  LabTimelineArrivalPoint,
  LabTimelinePublishPoint,
  LabTimelineSnapshot,
  WireChunkRecord,
} from './types'

export interface LabTimelineRecorder {
  observeArrival(record: WireChunkRecord): void
  observePublish(profile: RenderProfile, snapshot: RenderSnapshot): void
  snapshot(): LabTimelineSnapshot
}

export function createTimelineRecorder(input: {
  clock: EngineClock
  plannedDurationMs: number
}): LabTimelineRecorder {
  const startedAt = input.clock.now()
  const arrivals: LabTimelineArrivalPoint[] = []
  const publishes: Partial<Record<RenderProfile, LabTimelinePublishPoint[]>> = {}
  const publishProfiles: RenderProfile[] = []
  const observedCommits: Partial<Record<RenderProfile, number>> = {}

  return {
    observeArrival(record) {
      arrivals.push({ ...record, atMs: input.clock.now() - startedAt })
    },
    observePublish(profile, snapshot) {
      const commits = snapshot.metrics.commits
      if (commits <= (observedCommits[profile] ?? 0)) return
      observedCommits[profile] = commits
      let points = publishes[profile]
      if (!points) {
        points = []
        publishes[profile] = points
        publishProfiles.push(profile)
      }
      points.push({
        atMs: input.clock.now() - startedAt,
        revision: snapshot.revision,
        rawLength: snapshot.parts.reduce((length, part) => length + part.raw.length, 0),
        visibleLength: snapshot.parts.reduce((length, part) => length + part.visible.length, 0),
        commits,
      })
      publishes[profile] = points
    },
    snapshot() {
      const publishCopies: Partial<Record<RenderProfile, readonly LabTimelinePublishPoint[]>> = {}
      for (const profile of publishProfiles) {
        publishCopies[profile] = publishes[profile]?.slice() ?? []
      }
      return {
        elapsedMs: input.clock.now() - startedAt,
        plannedDurationMs: input.plannedDurationMs,
        arrivals: arrivals.slice(),
        publishes: publishCopies,
      }
    },
  }
}
