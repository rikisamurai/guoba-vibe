'use client'

import { type ReactNode, useState } from 'react'

import { Button } from '@/components/shadcn-ui/button'
import { Input } from '@/components/shadcn-ui/input'
import { Label } from '@/components/shadcn-ui/label'
import { Textarea } from '@/components/shadcn-ui/textarea'
import { parseUrl, buildUrl } from '@/lib/url-parse'

type QueryRow = { id: string; key: string; value: string }
type EditorParts = { scheme: string; path: string; query: QueryRow[] }

function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: ReactNode }) {
  return (
    <Label
      htmlFor={htmlFor}
      className="text-muted-foreground text-xs font-medium tracking-wide uppercase"
    >
      {children}
    </Label>
  )
}

function makeRow(key: string, value: string): QueryRow {
  return { id: crypto.randomUUID(), key, value }
}

function partsFromUrl(input: string): EditorParts {
  const parsed = parseUrl(input)
  if (!parsed.isValid) return { scheme: '', path: '', query: [] }
  return {
    scheme: parsed.scheme,
    path: parsed.path,
    query: Object.entries(parsed.query).map(([key, value]) => makeRow(key, value)),
  }
}

export function UrlEditor({
  name = 'url',
  defaultValue = '',
  required = true,
  value,
  onValueChange,
}: {
  name?: string
  defaultValue?: string
  required?: boolean
  value?: string
  onValueChange?: (value: string) => void
}) {
  const controlled = value !== undefined
  const [rawState, setRawState] = useState(defaultValue)
  const raw = controlled ? value : rawState
  const [parts, setParts] = useState<EditorParts>(() => partsFromUrl(value ?? defaultValue))
  const rawIsInvalid = raw.trim() !== '' && !parseUrl(raw).isValid

  function setRaw(next: string) {
    if (!controlled) setRawState(next)
    onValueChange?.(next)
  }

  function commitParts(next: EditorParts) {
    setParts(next)
    setRaw(buildUrl(next))
  }

  function onRawChange(input: string) {
    const sanitized = input.replace(/[\n\r\t]+/g, '')
    setRaw(sanitized)
    const parsed = parseUrl(sanitized)
    if (parsed.isValid) {
      setParts({
        scheme: parsed.scheme,
        path: parsed.path,
        query: Object.entries(parsed.query).map(([key, val]) => makeRow(key, val)),
      })
    }
  }

  function setQueryAt(id: string, patch: Partial<{ key: string; value: string }>) {
    commitParts({
      ...parts,
      query: parts.query.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    })
  }

  function removeQueryAt(id: string) {
    commitParts({ ...parts, query: parts.query.filter((p) => p.id !== id) })
  }

  function addQueryRow() {
    commitParts({ ...parts, query: [...parts.query, makeRow('', '')] })
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-1.5">
        <FieldLabel htmlFor={`${name}-raw`}>URL</FieldLabel>
        <Textarea
          id={`${name}-raw`}
          value={raw}
          onChange={(e) => onRawChange(e.target.value)}
          placeholder="xhsdiscover://rn/wakanda/buyer-conversion?sku_id=1"
          required={required}
          rows={3}
          className="min-h-20 py-2 font-mono leading-relaxed break-all"
          aria-invalid={rawIsInvalid || undefined}
        />
        {rawIsInvalid && <p className="text-sm text-red-500">Invalid URL</p>}
        <input type="hidden" name={name} value={raw} />
      </div>

      <div className="bg-muted/30 space-y-4 rounded-md border p-3.5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,0.55fr)_minmax(0,1fr)]">
          <div className="grid gap-1.5">
            <FieldLabel htmlFor={`${name}-scheme`}>Scheme</FieldLabel>
            <Input
              id={`${name}-scheme`}
              value={parts.scheme}
              onChange={(e) => commitParts({ ...parts, scheme: e.target.value.trim() })}
              placeholder="https"
              className="font-mono"
            />
          </div>
          <div className="grid gap-1.5">
            <FieldLabel htmlFor={`${name}-path`}>Path</FieldLabel>
            <Input
              id={`${name}-path`}
              value={parts.path}
              onChange={(e) => commitParts({ ...parts, path: e.target.value })}
              placeholder="rn/wakanda/buyer-conversion"
              className="font-mono"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <FieldLabel>Query params</FieldLabel>
            <Button type="button" variant="outline" size="sm" onClick={addQueryRow}>
              + add parameter
            </Button>
          </div>
          {parts.query.length === 0 ? (
            <p className="text-muted-foreground rounded-md border border-dashed px-3 py-4 text-center text-sm italic">
              (none)
            </p>
          ) : (
            <div className="grid gap-2">
              {parts.query.map((p) => (
                <div
                  key={p.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_2rem] items-center gap-2"
                >
                  <Input
                    value={p.key}
                    onChange={(e) => setQueryAt(p.id, { key: e.target.value })}
                    placeholder="key"
                    className="font-mono"
                  />
                  <span className="text-muted-foreground">=</span>
                  <Input
                    value={p.value}
                    onChange={(e) => setQueryAt(p.id, { value: e.target.value })}
                    placeholder="value"
                    className="font-mono"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeQueryAt(p.id)}
                    aria-label="Remove parameter"
                    title="Remove parameter"
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
