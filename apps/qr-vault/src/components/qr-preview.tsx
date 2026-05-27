import { useEffect, useState } from "react";
import { renderQrDataUrl } from "@/lib/qr";
import { parseDeepLink } from "@/lib/url";

type QrPreviewProps = {
  url: string;
  title?: string;
};

export function QrPreview({ url, title = "QR code" }: QrPreviewProps) {
  const [dataUrl, setDataUrl] = useState("");
  const [error, setError] = useState("");
  const parsed = parseDeepLink(url);

  useEffect(() => {
    let isActive = true;

    async function render() {
      if (!parsed.isValid) {
        setDataUrl("");
        setError("Enter a valid URL");
        return;
      }

      try {
        const nextDataUrl = await renderQrDataUrl(url);
        if (isActive) {
          setDataUrl(nextDataUrl);
          setError("");
        }
      } catch (err) {
        if (isActive) {
          setDataUrl("");
          setError(err instanceof Error ? err.message : "Unable to render QR");
        }
      }
    }

    void render();

    return () => {
      isActive = false;
    };
  }, [parsed.isValid, url]);

  return (
    <section className="qr-preview" aria-label="QR preview">
      {dataUrl ? <img src={dataUrl} alt={title} /> : <div className="qr-placeholder">{error || "No QR"}</div>}
    </section>
  );
}
