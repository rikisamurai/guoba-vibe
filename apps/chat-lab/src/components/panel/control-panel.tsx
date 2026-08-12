import { cx } from '../../lib/cx'
import { MetricsSection } from './metrics-section'
import { ModeSection } from './mode-section'
import { SourceSection } from './source-section'

/** Desktop: fixed sidebar. Mobile: slide-over drawer behind a header toggle. */
export function ControlPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      {open ? (
        <button
          type="button"
          aria-label="Close lab panel"
          onClick={onClose}
          className="bg-void/60 fixed inset-0 z-30 lg:hidden"
        />
      ) : null}
      <aside
        className={cx(
          'w-[300px] flex-col overflow-y-auto border-l border-seam bg-panel',
          open
            ? 'fixed inset-y-0 right-0 z-40 flex shadow-2xl lg:static lg:shadow-none'
            : 'hidden lg:flex',
        )}
      >
        <ModeSection />
        <SourceSection />
        <MetricsSection />
      </aside>
    </>
  )
}
