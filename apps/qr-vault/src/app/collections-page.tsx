import { Link, useRouterState } from "@tanstack/react-router";
import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import { useVault } from "@/app/use-vault";
import { parseDeepLink } from "@/lib/url";
import { getQrsForCollection } from "@/lib/vault";
import { upsertCollection } from "@/lib/storage";

export function CollectionsPage() {
  const { data, updateVault } = useVault();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const collectionId = pathname.startsWith("/collections/")
    ? decodeURIComponent(pathname.slice("/collections/".length))
    : "";
  const selectedCollection = data.collections.find((collection) => collection.id === collectionId);
  const qrs = selectedCollection ? getQrsForCollection(data, selectedCollection.id) : data.qrs;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    setTitle(selectedCollection?.title ?? "");
    setDescription(selectedCollection?.description ?? "");
  }, [selectedCollection?.id, selectedCollection?.title, selectedCollection?.description]);

  function saveCollection() {
    if (!title.trim()) return;
    updateVault((current) => upsertCollection(current, { id: selectedCollection?.id, title, description }));
    if (!selectedCollection) {
      setTitle("");
      setDescription("");
    }
  }

  return (
    <div className="workspace-grid collections-layout">
      <section className="panel sidebar-panel">
        <div className="section-heading">
          <h1>Collections</h1>
          <Link to="/" className="text-link">
            Vault
          </Link>
        </div>
        <div className="collection-list">
          {data.collections.map((collection) => (
            <Link
              activeProps={{ className: "active" }}
              className="collection-chip"
              key={collection.id}
              params={{ collectionId: collection.id }}
              to="/collections/$collectionId"
            >
              {collection.title}
            </Link>
          ))}
          {!data.collections.length && <div className="empty-inline">No collections</div>}
        </div>
      </section>

      <section className="panel editor-panel">
        <div className="section-heading">
          <h1>{selectedCollection ? "Edit collection" : "New collection"}</h1>
        </div>
        <div className="form-grid">
          <label className="field">
            <span>Title</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label className="field">
            <span>Description</span>
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} />
          </label>
          <button className="primary-button" type="button" onClick={saveCollection}>
            <Save aria-hidden="true" /> Save collection
          </button>
        </div>
      </section>

      <section className="panel list-panel">
        <div className="section-heading">
          <div>
            {selectedCollection && <p className="eyebrow">QRs in collection</p>}
            <h1>{selectedCollection?.title ?? "All QR codes"}</h1>
          </div>
          <span className="status">{qrs.length}</span>
        </div>
        <div className="qr-list">
          {qrs.length ? (
            qrs.map((qr) => {
              const parsed = parseDeepLink(qr.url);
              return (
                <Link className="qr-row link-row" key={qr.id} params={{ qrId: qr.id }} to="/q/$qrId">
                  <span>
                    <strong>{qr.title || parsed.path || qr.url}</strong>
                    <small>{parsed.path || qr.url}</small>
                  </span>
                </Link>
              );
            })
          ) : (
            <div className="empty-state">No QR codes</div>
          )}
        </div>
      </section>
    </div>
  );
}
