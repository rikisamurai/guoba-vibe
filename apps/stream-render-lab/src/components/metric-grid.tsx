export interface MetricItem {
  label: string
  value: string
  note: string
  tone?: 'signal' | 'warning'
}

interface MetricGridProps {
  items?: MetricItem[]
  label?: string
}

const DEFAULT_ITEMS: MetricItem[] = [
  { label: 'RAW → VISIBLE', value: '41 ms', note: 'p50 · 64 ms p95', tone: 'signal' },
  { label: 'COMMITS', value: '18.2/s', note: '2 s rolling window' },
  { label: 'STABLE BLOCKS', value: '7 / 8', note: '87% frozen' },
  { label: 'RENDER COST', value: '3.8 ms', note: 'last commit' },
]

export function MetricGrid({ items = DEFAULT_ITEMS, label = '本次实验指标' }: MetricGridProps) {
  return (
    <section className="metric-grid" aria-label={label}>
      {items.map((item) => (
        <article key={item.label} className={`metric metric--${item.tone ?? 'plain'}`}>
          <p>{item.label}</p>
          <strong>{item.value}</strong>
          <small>{item.note}</small>
        </article>
      ))}
    </section>
  )
}
