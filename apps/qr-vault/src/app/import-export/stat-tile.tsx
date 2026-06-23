export function StatTile({ value, label }: { value: number; label: string }) {
  return (
    <div className="bg-background/65 rounded-lg border p-3">
      <div className="font-mono text-2xl leading-none font-semibold tracking-tight text-[var(--signal)]">
        {value}
      </div>
      <div className="text-muted-foreground mt-2 text-[10px] font-medium tracking-wider uppercase">
        {label}
      </div>
    </div>
  )
}
