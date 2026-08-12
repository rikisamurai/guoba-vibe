import { useMetrics } from '../../hooks/use-metrics'

function ms(value: number): string {
  return value >= 100 ? Math.round(value).toString() : value.toFixed(1)
}

export function MetricsSection() {
  const snapshot = useMetrics()
  const tiles = [
    {
      label: 'Commits / s',
      value: snapshot.commitCount === 0 ? '—' : snapshot.commitsPerSec.toFixed(1),
      sub: snapshot.commitCount === 0 ? 'avg 2s window' : `${snapshot.commitCount} total`,
    },
    {
      label: 'Raw→Visible',
      value: snapshot.rawToVisibleMs === null ? '—' : `${ms(snapshot.rawToVisibleMs.p50)}ms`,
      sub: snapshot.rawToVisibleMs === null ? 'p95 —' : `p95 ${ms(snapshot.rawToVisibleMs.p95)}ms`,
    },
    {
      label: 'Render',
      value: snapshot.renderMs === null ? '—' : `${ms(snapshot.renderMs.last)}ms`,
      sub: snapshot.renderMs === null ? 'p95 —' : `p95 ${ms(snapshot.renderMs.p95)}ms`,
    },
    {
      label: 'Stable blocks',
      value:
        snapshot.blockCount === null
          ? '—'
          : `${Math.round((snapshot.stableRatio ?? 0) * snapshot.blockCount)}/${snapshot.blockCount}`,
      sub:
        snapshot.stableRatio === null
          ? 'M2+ only'
          : `${Math.round(snapshot.stableRatio * 100)}% frozen`,
    },
  ]
  return (
    <section className="border-seam bg-seam grid flex-1 grid-cols-2 gap-px border-b">
      {tiles.map((tile) => (
        <div key={tile.label} className="bg-panel px-4 py-4">
          <div className="text-faint font-mono text-[10px] tracking-[0.12em] uppercase">
            {tile.label}
          </div>
          <div className="mt-2 font-mono text-2xl font-medium">{tile.value}</div>
          <div className="text-mute mt-1 font-mono text-[10.5px]">{tile.sub}</div>
        </div>
      ))}
    </section>
  )
}
