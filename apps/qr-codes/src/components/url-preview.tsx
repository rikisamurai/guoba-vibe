import { parseUrl } from "@/lib/url-parse";

export function UrlPreview({ url }: { url: string }) {
  const parsed = parseUrl(url);
  if (!parsed.isValid) {
    return <p className="text-sm text-red-500">Invalid URL</p>;
  }
  const queryEntries = Object.entries(parsed.query);
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
      <dt className="text-muted-foreground">scheme</dt>
      <dd className="font-mono break-all">{parsed.scheme}</dd>
      <dt className="text-muted-foreground">path</dt>
      <dd className="font-mono break-all">{parsed.path}</dd>
      <dt className="text-muted-foreground">query</dt>
      <dd>
        {queryEntries.length === 0 ? (
          <span className="text-muted-foreground italic">(none)</span>
        ) : (
          <ul className="space-y-1">
            {queryEntries.map(([k, v]) => (
              <li key={k} className="font-mono">
                <span className="text-muted-foreground">{k}</span>={v}
              </li>
            ))}
          </ul>
        )}
      </dd>
    </dl>
  );
}
