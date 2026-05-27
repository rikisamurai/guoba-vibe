import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { buildUrlFromParts, normalizeQueryRows, parseDeepLink, queryToRows, type QueryRow } from "@/lib/url";

type UrlEditorProps = {
  value: string;
  onChange: (value: string) => void;
};

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
    const nextRows = rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row));
    updateParts({ rows: nextRows });
  }

  function addRow() {
    setRows([...rows, { key: "", value: "" }]);
  }

  function removeRow(index: number) {
    updateParts({ rows: rows.filter((_, rowIndex) => rowIndex !== index) });
  }

  return (
    <div className="url-editor">
      <label className="field full-span">
        <span>Full URL</span>
        <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={4} />
      </label>
      <label className="field">
        <span>Scheme</span>
        <input value={parsed.scheme} onChange={(event) => updateParts({ scheme: event.target.value })} />
      </label>
      <label className="field">
        <span>Path</span>
        <input value={parsed.path} onChange={(event) => updateParts({ path: event.target.value })} />
      </label>
      <div className="field full-span">
        <div className="field-row">
          <span>Query</span>
          <button className="ghost-button" type="button" onClick={addRow}>
            <Plus aria-hidden="true" /> Add
          </button>
        </div>
        <div className="query-editor">
          {rows.length ? (
            rows.map((row, index) => (
              <div className="query-edit-row" key={`${row.key}:${index}`}>
                <input
                  aria-label={`Query key ${index + 1}`}
                  value={row.key}
                  onChange={(event) => updateRow(index, { key: event.target.value })}
                />
                <input
                  aria-label={`Query value ${index + 1}`}
                  value={row.value}
                  onChange={(event) => updateRow(index, { value: event.target.value })}
                />
                <button className="icon-only" type="button" onClick={() => removeRow(index)} aria-label="Remove query row">
                  <Trash2 aria-hidden="true" />
                </button>
              </div>
            ))
          ) : (
            <button className="empty-action" type="button" onClick={addRow}>
              Add query param
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
