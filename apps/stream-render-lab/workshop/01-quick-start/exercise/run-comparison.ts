import { VirtualClock } from '../../../src/engine/clock'
import { createStreamingRenderEngine } from '../../../src/engine/create-engine'
import { ReplaySource } from '../../../src/replay/replay-source'
import { settleRuns } from '../../shared/settle-runs'
import type { QuickStartImplementation } from '../contract'
import { createQuickStartTrace } from '../fixture'

export const runComparison: QuickStartImplementation = async () => {
  const clock = new VirtualClock()
  const engine = createStreamingRenderEngine({ clock })
  const records = createQuickStartTrace()
  const m0 = engine.start({
    source: new ReplaySource(clock, records),
    profile: 'M0',
    reveal: 'direct',
    trace: 'full',
  })

  // TODO: 用同一 clock 和 records 启动一个独立 M4 run，替换这个占位别名。
  const m4 = m0
  const [m0Result, m4Result] = await settleRuns(clock, [m0, m4])
  return { m0: m0Result, m4: m4Result }
}
