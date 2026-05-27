import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Save, Share2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CollectionPicker } from "@/components/collection-picker";
import { CopyButton } from "@/components/copy-button";
import { ParsedUrlPanel } from "@/components/parsed-url-panel";
import { QrPreview } from "@/components/qr-preview";
import { UrlEditor } from "@/components/url-editor";
import { useVault } from "@/app/use-vault";
import { nanoid8 } from "@/lib/ids";
import { upsertQr } from "@/lib/storage";
import { buildSharePath, parseDeepLink } from "@/lib/url";

export function QrDetailPage() {
  const { data, updateVault } = useVault();
  const navigate = useNavigate();
  const location = useRouterState({ select: (state) => state.location });
  const search = location.search as { url?: string };
  const titleRef = useRef<HTMLInputElement>(null);
  const [autoFocusTitle] = useState(() => {
    const flag = sessionStorage.getItem("qr-vault:focus-title") === "1";
    if (flag) sessionStorage.removeItem("qr-vault:focus-title");
    return flag;
  });
  const isNew = location.pathname === "/new";
  const qrId = location.pathname.startsWith("/q/") ? decodeURIComponent(location.pathname.slice("/q/".length)) : "";
  const existingQr = data.qrs.find((qr) => qr.id === qrId);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [collectionIds, setCollectionIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const parsed = parseDeepLink(url);
  const sharePath = buildSharePath({ url, title, description });
  const shareUrl = `${window.location.origin}${window.location.pathname}#${sharePath}`;

  useEffect(() => {
    setTitle(existingQr?.title ?? "");
    setDescription(existingQr?.description ?? "");
    setUrl(existingQr?.url ?? search.url ?? "");
    setCollectionIds(
      existingQr ? data.collectionItems.filter((item) => item.qrId === existingQr.id).map((item) => item.collectionId) : []
    );
    setError("");
  }, [data.collectionItems, existingQr, search.url]);

  useEffect(() => {
    if (autoFocusTitle) titleRef.current?.focus();
  }, [autoFocusTitle]);

  function saveQr() {
    if (!parsed.isValid) {
      setError("A valid scheme and path are required.");
      return;
    }

    const id = existingQr?.id ?? (isNew ? nanoid8() : qrId);
    updateVault((current) =>
      upsertQr(current, {
        id,
        title,
        description,
        url,
        collectionIds,
      })
    );
    void navigate({ to: "/q/$qrId", params: { qrId: id } });
  }

  if (!isNew && !existingQr) {
    return (
      <div className="panel empty-state">
        <h1>QR not found</h1>
        <Link to="/" className="primary-button">
          Back to vault
        </Link>
      </div>
    );
  }

  return (
    <div className="detail-layout">
      <section className="detail-main panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{isNew ? "New QR" : "Saved QR"}</p>
            <h1>{title || "Untitled QR"}</h1>
          </div>
          <button className="primary-button" type="button" onClick={saveQr}>
            <Save aria-hidden="true" /> Save
          </button>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <div className="form-grid">
          <label className="field">
            <span>Title</span>
            <input
              ref={titleRef}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={autoFocusTitle ? "给这个 QR 起个名字" : undefined}
            />
          </label>
          <label className="field">
            <span>Description</span>
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} />
          </label>
        </div>

        <UrlEditor value={url} onChange={setUrl} />

        <section className="panel inset-panel">
          <div className="section-heading">
            <h2>Collections</h2>
            <Link to="/collections" className="text-link">
              Manage
            </Link>
          </div>
          <CollectionPicker collections={data.collections} selectedIds={collectionIds} onChange={setCollectionIds} />
        </section>
      </section>

      <aside className="preview-stack">
        <QrPreview title={title || "QR code"} url={url} />
        <ParsedUrlPanel url={url} />
        <section className="panel">
          <div className="section-heading">
            <h2>Share</h2>
            <Share2 aria-hidden="true" />
          </div>
          <p className="muted breakable">{shareUrl}</p>
          <CopyButton value={shareUrl} label="Copy share URL" />
        </section>
      </aside>
    </div>
  );
}
