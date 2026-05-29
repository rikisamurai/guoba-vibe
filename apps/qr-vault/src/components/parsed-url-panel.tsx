import { AlertCircle, Check } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { parseDeepLink } from '@/lib/url'

type ParsedUrlPanelProps = {
  url: string
}

export function ParsedUrlPanel({ url }: ParsedUrlPanelProps) {
  const parsed = parseDeepLink(url)
  const queryEntries = Object.entries(parsed.query)

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Parsed URL</CardTitle>
        <CardAction>
          <Badge variant="outline" className="gap-1.5">
            {parsed.isValid ? <Check className="size-3" /> : <AlertCircle className="size-3" />}
            {parsed.isValid ? 'valid' : 'invalid'}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="grid grid-cols-[60px_1fr] gap-x-3 gap-y-2 text-sm">
          <span className="text-muted-foreground pt-0.5 text-[10px] font-medium tracking-wider uppercase">
            scheme
          </span>
          <span className="text-foreground font-mono text-xs break-all">
            {parsed.scheme || '—'}
          </span>
          <span className="text-muted-foreground pt-0.5 text-[10px] font-medium tracking-wider uppercase">
            path
          </span>
          <span className="text-foreground font-mono text-xs break-all">{parsed.path || '—'}</span>
        </div>

        <Separator />

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
              query params
            </span>
            <span className="text-muted-foreground font-mono text-[10px]">
              {queryEntries.length} {queryEntries.length === 1 ? 'key' : 'keys'}
            </span>
          </div>
          {queryEntries.length ? (
            <div className="grid gap-1">
              {queryEntries.map(([key, value]) => (
                <div
                  key={key}
                  className="bg-muted/50 grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-2 rounded-md px-2 py-1.5 text-xs"
                >
                  <code className="text-foreground truncate font-mono" title={key}>
                    {key}
                  </code>
                  <code className="text-muted-foreground truncate font-mono" title={value}>
                    {value || '""'}
                  </code>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground rounded-md border border-dashed px-2 py-3 text-center text-xs italic">
              no query params
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
