import { parseUrl } from '@/lib/url-parse'

export function UrlPreview({ url }: { url: string }) {
  const parsed = parseUrl(url)
  if (!parsed.isValid) {
    return <p className="text-sm text-red-500">Invalid URL</p>
  }
  const queryEntries = Object.entries(parsed.query)
  return (
    <dl className="grid min-w-0 grid-cols-[4.5rem_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
      <dt className="text-muted-foreground">scheme</dt>
      <dd className="min-w-0 font-mono break-all">{parsed.scheme}</dd>
      <dt className="text-muted-foreground">path</dt>
      <dd className="min-w-0 font-mono break-all">{parsed.path}</dd>
      <dt className="text-muted-foreground">query</dt>
      <dd className="min-w-0">
        {queryEntries.length === 0 ? (
          <span className="text-muted-foreground italic">(none)</span>
        ) : (
          <ul className="grid gap-1.5">
            {queryEntries.map(([k, v]) => (
              <li
                key={k}
                className="bg-muted/40 grid min-w-0 grid-cols-[minmax(0,0.85fr)_minmax(0,1.25fr)] gap-2 rounded-md px-2 py-1.5 text-xs"
              >
                <code className="text-muted-foreground truncate font-mono" title={k}>
                  {k}
                </code>
                <code className="min-w-0 font-mono break-all" title={v}>
                  {v || '""'}
                </code>
              </li>
            ))}
          </ul>
        )}
      </dd>
    </dl>
  )
}
