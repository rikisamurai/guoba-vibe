import { HeavyPlanBuilder, heavyArtifactMatches } from '../heavy/plan'
import type {
  HeavyArtifact,
  HeavyCoordinatorFactory,
  HeavyMetrics,
  HeavyWorkCoordinator,
} from '../heavy/types'
import type { EngineClock } from './clock'
import { EMPTY_HEAVY_METRICS } from './metrics'
import type { RenderPart, RenderProfile } from './types'

export class RunHeavyRuntime {
  private readonly planner = new HeavyPlanBuilder()
  private readonly coordinator: HeavyWorkCoordinator | null
  private plan = this.planner.build('', [])
  private cancelled = false

  constructor(
    runId: string,
    profile: RenderProfile,
    clock: EngineClock,
    factory: HeavyCoordinatorFactory,
    onArtifact: (artifact: HeavyArtifact, metrics: HeavyMetrics) => void,
  ) {
    this.coordinator =
      profile === 'M4' || profile === 'production'
        ? factory({
            clock,
            runId,
            onArtifact: (artifact) => {
              if (this.plan.some((job) => heavyArtifactMatches(job, artifact))) {
                onArtifact(artifact, this.inspect())
              }
            },
          })
        : null
  }

  reconcile(runId: string, parts: readonly RenderPart[]): void {
    if (!this.coordinator) return
    this.plan = this.planner.build(runId, parts)
    this.coordinator.reconcile(this.plan)
  }

  async finalize(runId: string, parts: readonly RenderPart[], signal: AbortSignal) {
    if (!this.coordinator) return { artifacts: [], metrics: EMPTY_HEAVY_METRICS }
    this.plan = this.planner.build(runId, parts)
    const finalization = this.coordinator.finalize(this.plan, signal)
    const aborted = new Promise<null>((resolve) => {
      signal.addEventListener('abort', () => resolve(null), { once: true })
    })
    const artifacts = signal.aborted ? null : await Promise.race([finalization, aborted])
    const metrics = this.coordinator.inspect()
    this.stop()
    return { artifacts: artifacts ?? [], metrics }
  }

  cancel(): void {
    this.stop()
  }

  inspect(): HeavyMetrics {
    return this.coordinator?.inspect() ?? EMPTY_HEAVY_METRICS
  }

  private stop(): void {
    if (this.cancelled) return
    this.cancelled = true
    this.coordinator?.cancel()
  }
}
