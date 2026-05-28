import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  CopyPlus,
  Save,
  Share2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CollectionPicker } from "@/components/collection-picker";
import { ParsedUrlPanel } from "@/components/parsed-url-panel";
import { QrPreview } from "@/components/qr-preview";
import { UrlEditor } from "@/components/url-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useVault } from "@/app/use-vault";
import { nanoid8 } from "@/lib/ids";
import { upsertQr } from "@/lib/storage";
import { toast } from "sonner";
import { buildSharePath, parseDeepLink } from "@/lib/url";
import { useDocumentTitle } from "@/lib/use-document-title";

function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <Label
      htmlFor={htmlFor}
      className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground"
    >
      {children}
    </Label>
  );
}

export function QrDetailPage() {
  const { data, updateVault } = useVault();
  const navigate = useNavigate();
  const location = useRouterState({ select: (state) => state.location });
  const search = location.search as { url?: string; title?: string; description?: string };
  const titleRef = useRef<HTMLInputElement>(null);
  const [autoFocusTitle] = useState(() => {
    const flag = sessionStorage.getItem("qr-vault:focus-title") === "1";
    if (flag) sessionStorage.removeItem("qr-vault:focus-title");
    return flag;
  });
  const isNew = location.pathname === "/new";
  const qrId = location.pathname.startsWith("/q/")
    ? decodeURIComponent(location.pathname.slice("/q/".length))
    : "";
  const existingQr = data.qrs.find((qr) => qr.id === qrId);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [collectionIds, setCollectionIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [shareCopied, setShareCopied] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const parsed = parseDeepLink(url);
  const sharePath = buildSharePath({ url, title, description });
  const shareUrl = `${window.location.origin}${window.location.pathname}#${sharePath}`;

  useDocumentTitle(isNew ? "New QR" : title || existingQr?.title || "QR");

  useEffect(() => {
    setTitle(existingQr?.title ?? search.title ?? "");
    setDescription(existingQr?.description ?? search.description ?? "");
    setUrl(existingQr?.url ?? search.url ?? "");
    setCollectionIds(
      existingQr
        ? data.collectionItems
            .filter((item) => item.qrId === existingQr.id)
            .map((item) => item.collectionId)
        : [],
    );
    setError("");
  }, [data.collectionItems, existingQr, search.url, search.title, search.description]);

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
      }),
    );
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1200);
    void navigate({ to: "/q/$qrId", params: { qrId: id } });
  }

  function saveAsNew() {
    if (!parsed.isValid) {
      setError("A valid scheme and path are required.");
      return;
    }
    const newId = nanoid8();
    updateVault((current) =>
      upsertQr(current, { id: newId, title, description, url, collectionIds }),
    );
    toast.success("Saved as new QR");
    void navigate({ to: "/q/$qrId", params: { qrId: newId } });
  }

  function copyUrl() {
    if (!url) return;
    void navigator.clipboard.writeText(url);
    setUrlCopied(true);
    window.setTimeout(() => setUrlCopied(false), 1200);
  }

  if (!isNew && !existingQr) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-4">
          <p className="text-xl font-semibold">QR not found</p>
          <p className="text-sm text-muted-foreground">This QR code doesn't exist in your vault.</p>
          <Link to="/">
            <Button type="button">
              <ArrowLeft /> Back to vault
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <Link
          to="/"
          className="text-xs text-muted-foreground hover:text-foreground font-medium flex items-center gap-1"
        >
          <ArrowLeft className="size-3" /> Vault
        </Link>
        <Badge variant="outline" className="gap-1.5">
          {parsed.isValid ? <Check className="size-3" /> : <AlertCircle className="size-3" />}
          {parsed.isValid ? "ready to save" : "invalid URL"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_420px] gap-4 items-start">
        <Card>
          <CardHeader className="border-b">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wider font-medium text-muted-foreground mb-1">
                {isNew ? "New QR" : "Saved QR"}
              </p>
              <CardTitle className="text-2xl font-semibold tracking-tight truncate">
                {title || "Untitled QR"}
              </CardTitle>
            </div>
            <CardAction className="flex items-center gap-2">
              <Button onClick={saveQr} type="button" data-tour="qr-save">
                {saved ? <Check /> : <Save />}
                {saved ? "Saved" : "Save"}
              </Button>
              {!isNew && existingQr && (
                <Button onClick={saveAsNew} type="button" variant="outline">
                  <CopyPlus />
                  Save as New
                </Button>
              )}
            </CardAction>
          </CardHeader>

          <CardContent className="space-y-5 pt-4">
            {error && (
              <div className="px-3 py-2.5 rounded-md border border-destructive/30 bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <FieldLabel htmlFor="qr-title">Title</FieldLabel>
                <Input
                  id="qr-title"
                  ref={titleRef}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={autoFocusTitle ? "给这个 QR 起个名字" : "e.g. Conversion landing"}
                />
              </div>
              <div className="grid gap-1.5">
                <FieldLabel htmlFor="qr-desc">Description</FieldLabel>
                <Input
                  id="qr-desc"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Optional context"
                />
              </div>
            </div>

            <div className="pt-1">
              <div className="flex items-center gap-3 mb-3">
                <Separator className="flex-1" />
                <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">
                  Deep link
                </p>
                <Separator className="flex-1" />
              </div>
              <UrlEditor value={url} onChange={setUrl} />
            </div>

            <div className="pt-1">
              <div className="flex items-center gap-3 mb-3">
                <Separator className="flex-1" />
                <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">
                  Collections
                </p>
                <Separator className="flex-1" />
              </div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-muted-foreground">Assign to one or more collections</p>
                <Link
                  to="/collections"
                  className="text-xs text-muted-foreground hover:text-foreground font-medium flex items-center gap-1"
                >
                  Manage <ArrowRight className="size-3" />
                </Link>
              </div>
              <CollectionPicker
                collections={data.collections}
                selectedIds={collectionIds}
                onChange={setCollectionIds}
              />
            </div>
          </CardContent>
        </Card>

        <aside className="space-y-4 lg:sticky lg:top-0">
          <div data-tour="qr-preview">
            <QrPreview title={title || "QR code"} url={url} size="lg" />
          </div>
          <Button
            onClick={copyUrl}
            type="button"
            variant="outline"
            className="w-full"
            disabled={!url}
          >
            {urlCopied ? <Check /> : <Copy />}
            {urlCopied ? "Copied" : "Copy URL"}
          </Button>
          <ParsedUrlPanel url={url} />
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Share link</CardTitle>
              <CardAction>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => {
                    if (!shareUrl) return;
                    void navigator.clipboard.writeText(shareUrl);
                    setShareCopied(true);
                    window.setTimeout(() => setShareCopied(false), 1200);
                  }}
                  disabled={!shareUrl || !parsed.isValid}
                  title="Copy share URL"
                  aria-label="Copy share URL"
                >
                  {shareCopied ? <Check /> : <Share2 />}
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-2 pt-4">
              <div className="p-3 rounded-md bg-muted/50 border">
                <p className="text-[10px] font-mono text-foreground break-all leading-relaxed">
                  {shareUrl || "—"}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Send this hash URL to share the QR without uploading data.
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
