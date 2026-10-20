import type { CheckpointResult } from '@stream-render/contract'

export interface BeginnerCallbacks {
  onReset?: () => void
  onSettled?: (checks: readonly CheckpointResult[]) => void
}
