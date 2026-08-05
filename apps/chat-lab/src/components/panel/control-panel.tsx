import { MetricsSection } from './metrics-section'
import { ModeSection } from './mode-section'
import { SourceSection } from './source-section'

export function ControlPanel() {
  return (
    <aside className="border-seam bg-panel flex w-[300px] flex-col overflow-y-auto border-l">
      <ModeSection />
      <SourceSection />
      <MetricsSection />
    </aside>
  )
}
