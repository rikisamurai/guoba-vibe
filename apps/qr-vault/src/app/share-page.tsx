import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Save } from "lucide-react";
import { ParsedUrlPanel } from "@/components/parsed-url-panel";
import { QrPreview } from "@/components/qr-preview";
import { useVault } from "@/app/use-vault";
import { nanoid8 } from "@/lib/ids";
import { upsertQr } from "@/lib/storage";
import { parseDeepLink } from "@/lib/url";

export function SharePage() {
  const { updateVault } = useVault();
  const navigate = useNavigate();
  const search = useRouterState({ select: (state) => state.location.search }) as {
    url?: string;
    title?: string;
    description?: string;
  };
  const url = search.url ?? "";
  const title = search.title ?? "";
  const description = search.description ?? "";
  const parsed = parseDeepLink(url);

  function saveToLocal() {
    if (!parsed.isValid) return;
    const id = nanoid8();
    updateVault((current) => upsertQr(current, { id, title, description, url }));
    sessionStorage.setItem("qr-vault:focus-title", "1");
    void navigate({ to: "/q/$qrId", params: { qrId: id } });
  }

  return (
    <div className="share-layout">
      <section className="panel share-hero">
        <p className="eyebrow">Shared QR</p>
        <h1>{title || parsed.path || "QR preview"}</h1>
        {description && <p className="muted">{description}</p>}
        <QrPreview title={title || "Shared QR"} url={url} />
        <p className="breakable raw-url">{url || "No URL provided"}</p>
        <button className="primary-button" type="button" onClick={saveToLocal} disabled={!parsed.isValid}>
          <Save aria-hidden="true" /> Save to local
        </button>
      </section>
      <ParsedUrlPanel url={url} />
    </div>
  );
}
