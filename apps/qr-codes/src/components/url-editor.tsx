'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { parseUrl, buildUrl, type UrlParts } from '@/lib/url-parse'

function partsFromUrl(input: string): UrlParts {
  const parsed = parseUrl(input)
  if (!parsed.isValid) return { scheme: '', path: '', query: [] }
  return {
    scheme: parsed.scheme,
    path: parsed.path,
    query: Object.entries(parsed.query).map(([key, value]) => ({ key, value })),
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
  const [parts, setParts] = useState<UrlParts>(() => partsFromUrl(defaultValue))
  const rawIsInvalid = raw.trim() !== '' && !parseUrl(raw).isValid

  function commitParts(next: UrlParts) {
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
        query: Object.entries(parsed.query).map(([key, value]) => ({ key, value })),
      })
    }
  }

  function setQueryAt(index: number, patch: Partial<{ key: string; value: string }>) {
    const next: UrlParts = {
      ...parts,
      query: parts.query.map((p, i) => (i === index ? { ...p, ...patch } : p)),
    }
    commitParts(next)
  }

  function removeQueryAt(index: number) {
    commitParts({ ...parts, query: parts.query.filter((_, i) => i !== index) })
  }

  function addQueryRow() {
    commitParts({ ...parts, query: [...parts.query, { key: '', value: '' }] })
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
            {parts.query.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={p.key}
                  onChange={(e) => setQueryAt(i, { key: e.target.value })}
                  placeholder="key"
                  className="font-mono"
                />
                <span className="text-muted-foreground">=</span>
                <Input
                  value={p.value}
                  onChange={(e) => setQueryAt(i, { value: e.target.value })}
                  placeholder="value"
                  className="font-mono"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeQueryAt(i)}
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
