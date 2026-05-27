import { Check, Download, FileUp, Replace, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useVault } from "@/app/use-vault";
import { cn } from "@/lib/utils";
import {
  exportVaultJson,
  mergeVaultData,
  parseVaultData,
  replaceVaultData,
  type VaultData,
} from "@/lib/storage";
import { useDocumentTitle } from "@/lib/use-document-title";

export function ImportExportPage() {
  useDocumentTitle("Import & Export");
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
    setMessage(
      `Loaded ${parsed.qrs.length} QR codes and ${parsed.collections.length} collections.`
    );
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
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider font-medium text-muted-foreground mb-1">
            Data · Backup
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Import & Export</h1>
        </div>
        <Badge variant="outline" className="gap-1.5">
          <ShieldCheck className="size-3" /> local-only
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Vault snapshot</CardTitle>
            <CardAction>
              <Badge variant="outline">JSON v1</Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-5 pt-4">
            <div className="grid grid-cols-3 gap-2.5">
              <StatTile value={data.qrs.length} label="QR codes" />
              <StatTile value={data.collections.length} label="Collections" />
              <StatTile value={data.collectionItems.length} label="Tags" />
            </div>

            <div>
              <Button type="button" onClick={exportVault} size="lg" className="w-full">
                <Download /> Export JSON snapshot
              </Button>
              <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                Downloads a single <code className="font-mono text-foreground">.json</code> file
                containing your entire vault. Store it anywhere — Git, Dropbox, a USB stick.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle>Import from file</CardTitle>
            <CardAction>
              <FileUp className="size-3.5 text-muted-foreground" />
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <label
              className={cn(
                "block relative cursor-pointer rounded-md border-2 border-dashed transition-colors",
                "px-4 py-6 text-center",
                pendingData
                  ? "border-foreground/40 bg-muted/50"
                  : "border-border bg-card hover:bg-muted/30"
              )}
            >
              <input
                accept="application/json,.json"
                type="file"
                onChange={(event) => void readImportFile(event.target.files?.[0])}
                className="absolute inset-0 size-full opacity-0 cursor-pointer"
              />
              <FileUp className="size-5 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium mb-0.5">
                {fileName || "Drop or choose vault file"}
              </p>
              <p className="text-xs text-muted-foreground font-mono">
                {fileName ? "click to replace" : "qr-vault-export.json"}
              </p>
            </label>

            {message && (
              <div className="px-3 py-2.5 rounded-md border bg-muted/50 text-foreground text-xs flex items-start gap-2">
                <Check className="size-3.5 shrink-0 mt-0.5" />
                <span>{message}</span>
              </div>
            )}
            {error && (
              <div className="px-3 py-2.5 rounded-md border border-destructive/30 bg-destructive/10 text-destructive text-xs">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Button type="button" onClick={mergeImport} disabled={!pendingData}>
                Merge into local
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={replaceImport}
                disabled={!pendingData}
              >
                <Replace /> Replace
              </Button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Merge</strong> keeps existing local items, adds
              new ones, and overwrites on ID conflicts.{" "}
              <strong className="text-foreground">Replace</strong> wipes everything and starts
              fresh — this can't be undone.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatTile({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <div className="text-2xl font-semibold tracking-tight leading-none">{value}</div>
      <div className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground mt-2">
        {label}
      </div>
    </div>
  );
}
