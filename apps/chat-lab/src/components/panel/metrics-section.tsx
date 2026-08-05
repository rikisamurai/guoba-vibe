const TILES = [
  { label: 'Commits / s', value: '—', sub: 'avg 2s window' },
  { label: 'Raw→Visible', value: '—', sub: 'p95 —' },
  { label: 'Tail parse', value: '—', sub: 'p95 —' },
  { label: 'Stable blocks', value: '—', sub: '— frozen' },
]

export function MetricsSection() {
  return (
    <section className="border-seam bg-seam grid flex-1 grid-cols-2 gap-px border-b">
      {TILES.map((tile) => (
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
