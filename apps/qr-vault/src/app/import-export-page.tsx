import { Download, FileUp, Replace } from "lucide-react";
import { useState } from "react";
import { useVault } from "@/app/use-vault";
import { exportVaultJson, mergeVaultData, parseVaultData, replaceVaultData, type VaultData } from "@/lib/storage";

export function ImportExportPage() {
  const { data, updateVault } = useVault();
  const [pendingData, setPendingData] = useState<VaultData | null>(null);
  const [fileName, setFileName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function exportVault() {
    const blob = new Blob([exportVaultJson(data)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "qr-vault-export.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function readImportFile(file: File | undefined) {
    setMessage("");
    setError("");
    setPendingData(null);
    setFileName(file?.name ?? "");
    if (!file) return;

    const raw = await file.text();
    const parsed = parseVaultData(raw);
    if (!parsed) {
      setError("Invalid vault JSON. Local data was not changed.");
      return;
    }

    setPendingData(parsed);
    setMessage(`Loaded ${parsed.qrs.length} QR codes and ${parsed.collections.length} collections.`);
  }

  function mergeImport() {
    if (!pendingData) return;
    updateVault((current) => mergeVaultData(current, pendingData));
    setMessage(`Merged ${fileName || "vault file"} into local data.`);
  }

  function replaceImport() {
    if (!pendingData) return;
    updateVault((current) => replaceVaultData(current, pendingData));
    setMessage(`Replaced local data with ${fileName || "vault file"}.`);
  }

  return (
    <div className="import-layout">
      <section className="panel editor-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Local file</p>
            <h1>Import and export</h1>
          </div>
        </div>

        <div className="stats-grid">
          <div>
            <strong>{data.qrs.length}</strong>
            <span>QR codes</span>
          </div>
          <div>
            <strong>{data.collections.length}</strong>
            <span>collections</span>
          </div>
          <div>
            <strong>{data.collectionItems.length}</strong>
            <span>assignments</span>
          </div>
        </div>

        <button className="primary-button" type="button" onClick={exportVault}>
          <Download aria-hidden="true" /> Export JSON
        </button>
      </section>

      <section className="panel editor-panel">
        <div className="section-heading">
          <h2>Import JSON</h2>
          <FileUp aria-hidden="true" />
        </div>
        <label className="file-drop">
          <input
            accept="application/json,.json"
            type="file"
            onChange={(event) => void readImportFile(event.target.files?.[0])}
          />
          <span>{fileName || "Choose qr-vault-export.json"}</span>
        </label>

        {message && <div className="success-banner">{message}</div>}
        {error && <div className="error-banner">{error}</div>}

        <div className="button-row">
          <button className="primary-button" type="button" onClick={mergeImport} disabled={!pendingData}>
            Merge import
          </button>
          <button className="danger-button" type="button" onClick={replaceImport} disabled={!pendingData}>
            <Replace aria-hidden="true" /> Replace local data
          </button>
        </div>
      </section>
    </div>
  );
}
