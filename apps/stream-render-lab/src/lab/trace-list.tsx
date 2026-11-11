export function TraceList({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="lab2-trace">
      <h3>{title}</h3>
      <ol>{children}</ol>
    </section>
  )
}
