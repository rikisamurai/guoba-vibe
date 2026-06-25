import { Plus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { FieldLabel } from '@/components/field-label'
import { Button } from '@/components/shadcn-ui/button'
import { Input } from '@/components/shadcn-ui/input'
import { Switch } from '@/components/shadcn-ui/switch'
import { createQueryRow, type QueryRow } from '@/lib/url'
import { cn } from '@/lib/utils'

type QueryParamsEditorProps = {
  rows: QueryRow[]
  onRowsChange: (rows: QueryRow[]) => void
}

export function QueryParamsEditor({ rows, onRowsChange }: QueryParamsEditorProps) {
  const { t } = useTranslation()

  function updateRow(id: string, patch: Partial<QueryRow>) {
    onRowsChange(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }

  function addRow() {
    onRowsChange([...rows, createQueryRow()])
  }

  function removeRow(id: string) {
    onRowsChange(rows.filter((row) => row.id !== id))
  }

  return (
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
          <div className="bg-muted/50 text-muted-foreground grid grid-cols-[4.5rem_minmax(0,1fr)_minmax(0,1.4fr)_2.5rem] items-center gap-2 border-b px-3 py-2 text-[10px] font-medium tracking-wider uppercase">
            <span className="text-center">{t('urlEditor.statusColumn')}</span>
            <span>{t('urlEditor.keyColumn')}</span>
            <span>{t('urlEditor.valueColumn')}</span>
            <span className="sr-only">{t('urlEditor.actionsColumn')}</span>
          </div>
          {rows.map((row, index) => (
            <div
              key={row.id}
              className={cn(
                'grid grid-cols-[4.5rem_minmax(0,1fr)_minmax(0,1.4fr)_2.5rem] items-center gap-2 border-b px-3 py-2 last:border-b-0',
                !row.enabled && 'bg-muted/20',
              )}
            >
              <QueryToggle
                enabled={row.enabled}
                label={t('urlEditor.toggleQueryRow', {
                  label: row.key || t('common.queryKey', { index: index + 1 }),
                })}
                onChange={(enabled) => updateRow(row.id, { enabled })}
              />
              <Input
                aria-label={t('common.queryKey', { index: index + 1 })}
                value={row.key}
                onChange={(event) => updateRow(row.id, { key: event.target.value })}
                placeholder={t('urlEditor.keyPlaceholder')}
                className={cn('font-mono text-xs', !row.enabled && 'text-muted-foreground')}
              />
              <Input
                aria-label={t('common.queryValue', { index: index + 1 })}
                value={row.value}
                onChange={(event) => updateRow(row.id, { value: event.target.value })}
                placeholder={t('urlEditor.valuePlaceholder')}
                className={cn('font-mono text-xs', !row.enabled && 'text-muted-foreground')}
              />
              <Button
                variant="ghost"
                size="icon-sm"
                type="button"
                onClick={() => removeRow(row.id)}
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
  )
}

function QueryToggle({
  enabled,
  label,
  onChange,
}: {
  enabled: boolean
  label: string
  onChange: (enabled: boolean) => void
}) {
  return (
    <div className="flex w-full justify-center">
      <Switch checked={enabled} onCheckedChange={onChange} aria-label={label} />
    </div>
  )
}
