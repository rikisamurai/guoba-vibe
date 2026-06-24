import { Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { FieldLabel } from '@/components/field-label'
import { Button } from '@/components/shadcn-ui/button'
import { Input } from '@/components/shadcn-ui/input'
import { Textarea } from '@/components/shadcn-ui/textarea'
import {
  buildUrlFromParts,
  normalizeQueryRows,
  parseDeepLink,
  queryToRows,
  type QueryRow,
} from '@/lib/url'

type UrlEditorProps = {
  value: string
  onChange: (value: string) => void
  children?: React.ReactNode
}

export function UrlEditor({ value, onChange, children }: UrlEditorProps) {
  const { t } = useTranslation()
  const parsed = parseDeepLink(value)
  const [rows, setRows] = useState<QueryRow[]>(() => queryToRows(parsed.query))

  useEffect(() => {
    setRows(queryToRows(parseDeepLink(value).query))
  }, [value])

  function updateParts(next: { scheme?: string; path?: string; rows?: QueryRow[] }) {
    const nextRows = next.rows ?? rows
    setRows(nextRows)
    onChange(
      buildUrlFromParts({
        scheme: next.scheme ?? parsed.scheme,
        path: next.path ?? parsed.path,
        query: normalizeQueryRows(nextRows),
      }),
    )
  }

  function updateRow(index: number, patch: Partial<QueryRow>) {
    const nextRows = rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row))
    updateParts({ rows: nextRows })
  }

  function addRow() {
    setRows([...rows, { key: '', value: '' }])
  }

  function removeRow(index: number) {
    updateParts({ rows: rows.filter((_, rowIndex) => rowIndex !== index) })
  }

  return (
    <div className="space-y-3">
      <div className="bg-background/65 rounded-lg border p-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between gap-3">
          <FieldLabel htmlFor="url-full">{t('urlEditor.fullUrl')}</FieldLabel>
          <span className="text-muted-foreground font-mono text-[10px]">
            {rows.length} {rows.length === 1 ? t('common.key') : t('common.keys')}
          </span>
        </div>
        <Textarea
          id="url-full"
          data-tour="new-url-input"
          value={value}
          onChange={(event) => onChange(event.target.value)}
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

      <div className="space-y-2">
        <div className="flex items-end justify-between gap-3">
          <div className="space-y-1">
            <FieldLabel>{t('common.queryParams')}</FieldLabel>
            <p className="text-muted-foreground text-xs">{t('urlEditor.queryDescription')}</p>
          </div>
          <Button variant="ghost" size="xs" type="button" onClick={addRow}>
            <Plus /> {t('common.addParam')}
          </Button>
        </div>
        {rows.length ? (
          <div className="bg-background/65 overflow-hidden rounded-lg border shadow-sm">
            <div className="bg-muted/50 text-muted-foreground grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_2.5rem] items-center gap-2 border-b px-3 py-2 text-[10px] font-medium tracking-wider uppercase">
              <span>{t('urlEditor.keyColumn')}</span>
              <span>{t('urlEditor.valueColumn')}</span>
              <span className="sr-only">{t('urlEditor.actionsColumn')}</span>
            </div>
            {rows.map((row, index) => (
              <div
                key={index}
                className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_2.5rem] items-center gap-2 border-b px-3 py-2 last:border-b-0"
              >
                <Input
                  aria-label={t('common.queryKey', { index: index + 1 })}
                  value={row.key}
                  onChange={(event) => updateRow(index, { key: event.target.value })}
                  placeholder={t('urlEditor.keyPlaceholder')}
                  className="font-mono text-xs"
                />
                <Input
                  aria-label={t('common.queryValue', { index: index + 1 })}
                  value={row.value}
                  onChange={(event) => updateRow(index, { value: event.target.value })}
                  placeholder={t('urlEditor.valuePlaceholder')}
                  className="font-mono text-xs"
                />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  type="button"
                  onClick={() => removeRow(index)}
                  aria-label={t('common.removeQueryRow')}
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <button
            type="button"
            onClick={addRow}
            className="text-muted-foreground hover:text-foreground hover:bg-muted/50 w-full rounded-lg border border-dashed py-3 text-xs transition-colors"
          >
            {t('common.addQueryParam')}
          </button>
        )}
      </div>
    </div>
  )
}
