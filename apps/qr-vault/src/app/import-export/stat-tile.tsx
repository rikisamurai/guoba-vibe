export function StatTile({ value, label }: { value: number; label: string }) {
  return (
    <div className="bg-muted/30 rounded-md border p-3">
      <div className="text-2xl leading-none font-semibold tracking-tight">{value}</div>
      <div className="text-muted-foreground mt-2 text-[10px] font-medium tracking-wider uppercase">
        {label}
      </div>
    </div>
  )
}
