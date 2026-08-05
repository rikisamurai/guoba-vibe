import { useEffect, useState } from 'react'

import type { MetricsSnapshot } from '../engine/metrics'
import { metrics } from '../engine/metrics'

/** Panel refresh is self-throttled to ~4Hz so observing costs nothing. */
export function useMetrics(): MetricsSnapshot {
  const [snapshot, setSnapshot] = useState<MetricsSnapshot>(() => metrics.snapshot())
  useEffect(() => {
    const timer = setInterval(() => setSnapshot(metrics.snapshot()), 250)
    return () => clearInterval(timer)
  }, [])
  return snapshot
}
