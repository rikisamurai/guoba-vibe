import { parseDeepLink } from "@/lib/url";

type ParsedUrlPanelProps = {
  url: string;
};

export function ParsedUrlPanel({ url }: ParsedUrlPanelProps) {
  const parsed = parseDeepLink(url);
  const queryEntries = Object.entries(parsed.query);

  return (
    <section className="panel parsed-panel" aria-label="Parsed URL">
      <div className="section-heading">
        <h2>Parsed URL</h2>
        <span className={parsed.isValid ? "status ok" : "status warn"}>
          {parsed.isValid ? "valid" : "invalid"}
        </span>
      </div>
      <dl className="parsed-grid">
        <div>
          <dt>scheme</dt>
          <dd>{parsed.scheme || "-"}</dd>
        </div>
        <div>
          <dt>path</dt>
          <dd>{parsed.path || "-"}</dd>
        </div>
      </dl>
      <div className="query-table">
        <div className="query-table-head">
          <span>query key</span>
          <span>value</span>
        </div>
        {queryEntries.length ? (
          queryEntries.map(([key, value]) => (
            <div className="query-table-row" key={key}>
              <code>{key}</code>
              <code>{value || '""'}</code>
            </div>
          ))
        ) : (
          <div className="empty-inline">No query params</div>
        )}
      </div>
    </section>
  );
}
