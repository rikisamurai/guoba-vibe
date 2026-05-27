import { Link, useNavigate } from "@tanstack/react-router";
import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { ParsedUrlPanel } from "@/components/parsed-url-panel";
import { QrPreview } from "@/components/qr-preview";
import { useVault } from "@/app/use-vault";
import { parseDeepLink } from "@/lib/url";
import { searchQrs } from "@/lib/vault";

export function WorkspacePage() {
  const { data } = useVault();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [quickUrl, setQuickUrl] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const visibleQrs = searchQrs(data, search);
  const selectedQr = data.qrs.find((qr) => qr.id === selectedId) ?? visibleQrs[0];

  function openNewQr() {
    void navigate({ to: "/new", search: { url: quickUrl } });
  }

  return (
    <div className="workspace-grid">
      <section className="panel sidebar-panel">
        <div className="section-heading">
          <h1>Collections</h1>
          <Link to="/collections" className="text-link">
            Manage
          </Link>
        </div>
        <div className="collection-list">
          <Link to="/" className="collection-chip active">
            All QR <span>{data.qrs.length}</span>
          </Link>
          {data.collections.map((collection) => {
            const count = data.collectionItems.filter((item) => item.collectionId === collection.id).length;
            return (
              <Link
                className="collection-chip"
                key={collection.id}
                params={{ collectionId: collection.id }}
                to="/collections/$collectionId"
              >
                {collection.title} <span>{count}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="panel list-panel">
        <div className="hero-row">
          <div>
            <p className="eyebrow">Local static vault</p>
            <h1>Deep-link QR codes</h1>
          </div>
          <button className="primary-button" type="button" onClick={openNewQr}>
            <Plus aria-hidden="true" /> New QR
          </button>
        </div>

        <div className="quick-add">
          <input
            value={quickUrl}
            onChange={(event) => setQuickUrl(event.target.value)}
            placeholder="xhsdiscover://rn/wakanda/buyer-conversion?sku_id=1"
          />
          <button type="button" onClick={openNewQr}>
            Open editor
          </button>
        </div>

        <label className="search-box">
          <Search aria-hidden="true" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title, path, query" />
        </label>

        <div className="qr-list">
          {visibleQrs.length ? (
            visibleQrs.map((qr) => {
              const parsed = parseDeepLink(qr.url);
              const collectionCount = data.collectionItems.filter((item) => item.qrId === qr.id).length;
              return (
                <button className="qr-row" key={qr.id} type="button" onClick={() => setSelectedId(qr.id)}>
                  <span>
                    <strong>{qr.title || parsed.path || qr.url}</strong>
                    <small>{parsed.path || qr.url}</small>
                  </span>
                  <span className="pill">{collectionCount} collections</span>
                </button>
              );
            })
          ) : (
            <div className="empty-state">No QR codes</div>
          )}
        </div>
      </section>

      <aside className="preview-stack">
        {selectedQr ? (
          <>
            <QrPreview title={selectedQr.title} url={selectedQr.url} />
            <div className="panel">
              <div className="section-heading">
                <h2>{selectedQr.title || "Untitled QR"}</h2>
                <Link params={{ qrId: selectedQr.id }} to="/q/$qrId" className="text-link">
                  Edit
                </Link>
              </div>
              <p className="muted breakable">{selectedQr.url}</p>
            </div>
            <ParsedUrlPanel url={selectedQr.url} />
          </>
        ) : (
          <div className="panel empty-state">No preview</div>
        )}
      </aside>
    </div>
  );
}
