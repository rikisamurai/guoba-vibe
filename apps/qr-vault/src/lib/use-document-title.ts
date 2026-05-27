import { useEffect } from "react";

const SUFFIX = "QR Vault";

export function useDocumentTitle(section?: string | null) {
  useEffect(() => {
    document.title = section ? `${section} · ${SUFFIX}` : SUFFIX;
  }, [section]);
}
