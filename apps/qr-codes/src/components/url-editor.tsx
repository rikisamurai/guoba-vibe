'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { parseUrl, buildUrl } from '@/lib/url-parse'

type QueryRow = { id: string; key: string; value: string }
type EditorParts = { scheme: string; path: string; query: QueryRow[] }

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
}: {
  name?: string
  defaultValue?: string
  required?: boolean
}) {
  const [raw, setRaw] = useState(defaultValue)
  const [parts, setParts] = useState<EditorParts>(() => partsFromUrl(defaultValue))
  const rawIsInvalid = raw.trim() !== '' && !parseUrl(raw).isValid

  function commitParts(next: EditorParts) {
    setParts(next)
    setRaw(buildUrl(next))
  }

  function onRawChange(value: string) {
    const sanitized = value.replace(/[\n\r\t]+/g, '')
    setRaw(sanitized)
    const parsed = parseUrl(sanitized)
    if (parsed.isValid) {
      setParts({
        scheme: parsed.scheme,
        path: parsed.path,
        query: Object.entries(parsed.query).map(([key, value]) => makeRow(key, value)),
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
    <div className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor={`${name}-raw`}>URL</Label>
        <Textarea
          id={`${name}-raw`}
          value={raw}
          onChange={(e) => onRawChange(e.target.value)}
          placeholder="xhsdiscover://rn/wakanda/buyer-conversion?sku_id=1"
          required={required}
          rows={1}
          className="min-h-9 py-1.5 font-mono break-all"
          aria-invalid={rawIsInvalid || undefined}
        />
        {rawIsInvalid && <p className="text-sm text-red-500">Invalid URL</p>}
        <input type="hidden" name={name} value={raw} />
      </div>

      <div className="bg-muted/30 space-y-3 rounded-md border p-3">
        <div className="grid grid-cols-[5rem_1fr] items-center gap-x-3 gap-y-2">
          <Label htmlFor={`${name}-scheme`} className="text-muted-foreground">
            scheme
          </Label>
          <Input
            id={`${name}-scheme`}
            value={parts.scheme}
            onChange={(e) => commitParts({ ...parts, scheme: e.target.value.trim() })}
            placeholder="https"
            className="font-mono"
          />
          <Label htmlFor={`${name}-path`} className="text-muted-foreground">
            path
          </Label>
          <Input
            id={`${name}-path`}
            value={parts.path}
            onChange={(e) => commitParts({ ...parts, path: e.target.value })}
            placeholder="rn/wakanda/buyer-conversion"
            className="font-mono"
          />
          <span className="text-muted-foreground mt-2 self-start text-sm">query</span>
          <div className="space-y-2">
            {parts.query.length === 0 && (
              <p className="text-muted-foreground text-sm italic">(none)</p>
            )}
            {parts.query.map((p) => (
              <div key={p.id} className="flex items-center gap-2">
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
                >
                  ×
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addQueryRow}>
              + add parameter
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
