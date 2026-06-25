type ScanFact = {
  label: string
  value: string | number
}

export function ScanFactRow({ facts }: { facts: ScanFact[] }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {facts.map((fact) => (
        <div key={fact.label} className="bg-background/70 rounded-lg border px-2.5 py-2">
          <div className="text-muted-foreground truncate text-[10px] font-medium tracking-wider uppercase">
            {fact.label}
          </div>
          <div className="mt-1 truncate font-mono text-sm font-semibold tabular-nums">
            {fact.value}
          </div>
        </div>
      ))}
    </div>
  )
}
