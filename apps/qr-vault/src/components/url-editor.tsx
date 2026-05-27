import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  buildUrlFromParts,
  normalizeQueryRows,
  parseDeepLink,
  queryToRows,
  type QueryRow,
} from "@/lib/url";

type UrlEditorProps = {
  value: string;
  onChange: (value: string) => void;
};

function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <Label
      htmlFor={htmlFor}
      className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground"
    >
      {children}
    </Label>
  );
}

export function UrlEditor({ value, onChange }: UrlEditorProps) {
  const parsed = parseDeepLink(value);
  const [rows, setRows] = useState<QueryRow[]>(() => queryToRows(parsed.query));

  useEffect(() => {
    setRows(queryToRows(parseDeepLink(value).query));
  }, [value]);

  function updateParts(next: { scheme?: string; path?: string; rows?: QueryRow[] }) {
    const nextRows = next.rows ?? rows;
    setRows(nextRows);
    onChange(
      buildUrlFromParts({
        scheme: next.scheme ?? parsed.scheme,
        path: next.path ?? parsed.path,
        query: normalizeQueryRows(nextRows),
      })
    );
  }

  function updateRow(index: number, patch: Partial<QueryRow>) {
    const nextRows = rows.map((row, rowIndex) =>
      rowIndex === index ? { ...row, ...patch } : row
    );
    updateParts({ rows: nextRows });
  }

  function addRow() {
    setRows([...rows, { key: "", value: "" }]);
  }

  function removeRow(index: number) {
    updateParts({ rows: rows.filter((_, rowIndex) => rowIndex !== index) });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-1.5">
        <FieldLabel htmlFor="url-full">Full URL</FieldLabel>
        <Textarea
          id="url-full"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={3}
          className="font-mono text-xs"
          placeholder="xhsdiscover://rn/wakanda/buyer-conversion?sku_id=1"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-3">
        <div className="grid gap-1.5">
          <FieldLabel htmlFor="url-scheme">Scheme</FieldLabel>
          <Input
            id="url-scheme"
            value={parsed.scheme}
            onChange={(event) => updateParts({ scheme: event.target.value })}
            className="font-mono text-xs"
            placeholder="xhsdiscover"
          />
        </div>
        <div className="grid gap-1.5">
          <FieldLabel htmlFor="url-path">Path</FieldLabel>
          <Input
            id="url-path"
            value={parsed.path}
            onChange={(event) => updateParts({ path: event.target.value })}
            className="font-mono text-xs"
            placeholder="rn/wakanda/buyer-conversion"
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <FieldLabel>Query Params</FieldLabel>
          <Button variant="ghost" size="xs" type="button" onClick={addRow}>
            <Plus /> Add param
          </Button>
        </div>
        {rows.length ? (
          <div className="grid gap-2">
            {rows.map((row, index) => (
              <div
                key={`${row.key}:${index}`}
                className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] gap-2 items-center"
              >
                <Input
                  aria-label={`Query key ${index + 1}`}
                  value={row.key}
                  onChange={(event) => updateRow(index, { key: event.target.value })}
                  placeholder="key"
                  className="font-mono text-xs"
                />
                <Input
                  aria-label={`Query value ${index + 1}`}
                  value={row.value}
                  onChange={(event) => updateRow(index, { value: event.target.value })}
                  placeholder="value"
                  className="font-mono text-xs"
                />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  type="button"
                  onClick={() => removeRow(index)}
                  aria-label="Remove query row"
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
            className="w-full text-xs text-muted-foreground hover:text-foreground py-3 border border-dashed rounded-md hover:bg-muted/50 transition-colors"
          >
            + Add query param
          </button>
        )}
      </div>
    </div>
  );
}
