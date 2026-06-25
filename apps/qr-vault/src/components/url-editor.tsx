import { useTranslation } from 'react-i18next'

import { FieldLabel } from '@/components/field-label'
import { QueryParamsEditor } from '@/components/query-params-editor'
import { Input } from '@/components/shadcn-ui/input'
import { Textarea } from '@/components/shadcn-ui/textarea'
import { buildUrlFromQueryRows, parseDeepLink, queryToRows, type QueryRow } from '@/lib/url'

export type UrlEditorChange = {
  url: string
  queryRows: QueryRow[]
}

type UrlEditorProps = {
  value: string
  queryRows: QueryRow[]
  onChange: (value: UrlEditorChange) => void
  children?: React.ReactNode
}

export function UrlEditor({ value, queryRows, onChange, children }: UrlEditorProps) {
  const { t } = useTranslation()
  const parsed = parseDeepLink(value)

  function updateFullUrl(nextUrl: string) {
    onChange({
      url: nextUrl,
      queryRows: queryToRows(parseDeepLink(nextUrl).query),
    })
  }

  function updateParts(next: { scheme?: string; path?: string; queryRows?: QueryRow[] }) {
    const nextRows = next.queryRows ?? queryRows
    onChange({
      url: buildUrlFromQueryRows({
        scheme: next.scheme ?? parsed.scheme,
        path: next.path ?? parsed.path,
        rows: nextRows,
      }),
      queryRows: nextRows,
    })
  }

  return (
    <div className="space-y-3">
      <div className="bg-background/65 rounded-lg border p-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between gap-3">
          <FieldLabel htmlFor="url-full">{t('urlEditor.fullUrl')}</FieldLabel>
          <span className="text-muted-foreground font-mono text-[10px]">
            {queryRows.length} {queryRows.length === 1 ? t('common.key') : t('common.keys')}
          </span>
        </div>
        <Textarea
          id="url-full"
          data-tour="new-url-input"
          value={value}
          onChange={(event) => updateFullUrl(event.target.value)}
          rows={3}
          className="min-h-24 resize-y font-mono text-xs leading-relaxed"
          placeholder={t('urlEditor.fullUrlPlaceholder')}
        />
        {children}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-[180px_1fr]">
        <div className="grid gap-1.5">
          <FieldLabel htmlFor="url-scheme">{t('urlEditor.scheme')}</FieldLabel>
          <Input
            id="url-scheme"
            value={parsed.scheme}
            onChange={(event) => updateParts({ scheme: event.target.value })}
            className="font-mono text-xs"
            placeholder={t('urlEditor.schemePlaceholder')}
          />
        </div>
        <div className="grid gap-1.5">
          <FieldLabel htmlFor="url-path">{t('urlEditor.path')}</FieldLabel>
          <Input
            id="url-path"
            value={parsed.path}
            onChange={(event) => updateParts({ path: event.target.value })}
            className="font-mono text-xs"
            placeholder={t('urlEditor.pathPlaceholder')}
          />
        </div>
      </div>

      <QueryParamsEditor
        rows={queryRows}
        onRowsChange={(rows) => updateParts({ queryRows: rows })}
      />
    </div>
  )
}
