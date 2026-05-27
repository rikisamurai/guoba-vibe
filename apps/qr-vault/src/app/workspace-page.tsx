import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Inbox, LayoutGrid, Plus, Search, Share2, SquarePen } from "lucide-react";
import { useState } from "react";
import { useDocumentTitle } from "@/lib/use-document-title";
import { ParsedUrlPanel } from "@/components/parsed-url-panel";
import { QrPreview } from "@/components/qr-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useVault } from "@/app/use-vault";
import { cn } from "@/lib/utils";
import { parseDeepLink } from "@/lib/url";
import { getUncategorizedQrs, searchQrs } from "@/lib/vault";

export function WorkspacePage() {
  useDocumentTitle("Vault");
  const { data } = useVault();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [quickUrl, setQuickUrl] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [showUncategorized, setShowUncategorized] = useState(false);
  const baseQrs = showUncategorized ? getUncategorizedQrs(data) : data.qrs;
  const visibleQrs = searchQrs({ ...data, qrs: baseQrs }, search);
  const selectedQr = data.qrs.find((qr) => qr.id === selectedId) ?? visibleQrs[0];
  const uncategorizedCount = getUncategorizedQrs(data).length;

  function openNewQr() {
    void navigate({ to: "/new", search: { url: quickUrl } });
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[240px_minmax(0,1fr)_340px] gap-4 items-start">
      <Card className="xl:sticky xl:top-0">
        <CardHeader className="border-b">
          <CardTitle>Collections</CardTitle>
          <CardAction>
            <Link
              to="/collections"
              className="text-xs text-muted-foreground hover:text-foreground font-medium flex items-center gap-1"
            >
              Manage <ArrowRight className="size-3" />
            </Link>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-1 pt-4">
          <FilterChip
            icon={<LayoutGrid className="size-3.5" />}
            label="All QR"
            count={data.qrs.length}
            active={!showUncategorized}
            onClick={() => setShowUncategorized(false)}
          />
          {uncategorizedCount > 0 && (
            <FilterChip
              icon={<Inbox className="size-3.5" />}
              label="Uncategorized"
              count={uncategorizedCount}
              active={showUncategorized}
              onClick={() => setShowUncategorized(true)}
            />
          )}
          {data.collections.length > 0 && (
            <>
              <Separator className="my-2" />
              <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground px-3 py-1">
                By collection
              </p>
              {data.collections.map((collection) => {
                const count = data.collectionItems.filter(
                  (i) => i.collectionId === collection.id
                ).length;
                return (
                  <Link
                    key={collection.id}
                    to="/collections/$collectionId"
                    params={{ collectionId: collection.id }}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  >
                    <span className="truncate">{collection.title}</span>
                    <Badge variant="outline">{count}</Badge>
                  </Link>
                );
              })}
            </>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wider font-medium text-muted-foreground">
              Local · Static · Encrypted
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">QR Vault</h1>
            <p className="text-sm text-muted-foreground">
              Deep-link QR codes, stored & shared on your own terms.
            </p>
          </div>
          <Button onClick={openNewQr} type="button">
            <Plus /> New QR
          </Button>
        </div>

        <Card>
          <CardContent className="space-y-2 py-2">
            <div className="flex items-center gap-2 px-3 h-9 rounded-md border focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 transition-colors">
              <span className="font-mono text-xs text-muted-foreground shrink-0">{">"}_</span>
              <input
                value={quickUrl}
                onChange={(event) => setQuickUrl(event.target.value)}
                placeholder="xhsdiscover://rn/wakanda/buyer-conversion?sku_id=1"
                className="flex-1 min-w-0 bg-transparent text-sm font-mono outline-none placeholder:text-muted-foreground"
                onKeyDown={(event) => {
                  if (event.key === "Enter") openNewQr();
                }}
              />
              <Button variant="ghost" size="xs" type="button" onClick={openNewQr}>
                Open editor <ArrowRight />
              </Button>
            </div>
            <div className="flex items-center gap-2 px-3 h-9 rounded-md border focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 transition-colors">
              <Search className="size-3.5 text-muted-foreground shrink-0" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by title, path, or query keys…"
                className="flex-1 min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  clear
                </button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">
              {visibleQrs.length} {visibleQrs.length === 1 ? "result" : "results"}
            </p>
            {search && <Badge variant="outline">filtered</Badge>}
          </div>
          {visibleQrs.length ? (
            <div className="space-y-2">
              {visibleQrs.map((qr) => {
                const parsed = parseDeepLink(qr.url);
                const isSelected = qr.id === selectedQr?.id;
                return (
                  <div key={qr.id} className="relative group">
                    <button
                      type="button"
                      onClick={() => setSelectedId(qr.id)}
                      className={cn(
                        "w-full text-left p-3.5 pr-24 rounded-lg border transition-colors",
                        isSelected
                          ? "border-foreground/20 bg-muted/50"
                          : "border-border bg-card hover:bg-muted/30"
                      )}
                    >
                      {isSelected && (
                        <div className="absolute left-0 top-3 bottom-3 w-0.5 bg-foreground rounded-r-full" />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={cn(
                              "size-1.5 rounded-full",
                              parsed.isValid ? "bg-foreground" : "bg-muted-foreground"
                            )}
                          />
                          <strong className="text-sm font-medium truncate">
                            {qr.title || parsed.path || qr.url}
                          </strong>
                        </div>
                        <p className="text-xs font-mono text-muted-foreground truncate pl-3.5">
                          {parsed.path || qr.url}
                        </p>
                      </div>
                    </button>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <Link
                        to="/share"
                        search={{
                          url: qr.url,
                          title: qr.title ?? "",
                          description: qr.description ?? "",
                        }}
                        title="Share"
                        aria-label={`Share ${qr.title || parsed.path || "QR"}`}
                        className="size-9 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background border border-transparent hover:border-border transition-colors"
                      >
                        <Share2 className="size-4" />
                      </Link>
                      <Link
                        to="/q/$qrId"
                        params={{ qrId: qr.id }}
                        title="Edit"
                        aria-label={`Edit ${qr.title || parsed.path || "QR"}`}
                        className="size-9 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background border border-transparent hover:border-border transition-colors"
                      >
                        <SquarePen className="size-4" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="py-10 text-center">
                <div className="inline-flex size-12 rounded-md border items-center justify-center mb-3">
                  <Search className="size-4 text-muted-foreground" />
                </div>
                <p className="text-sm mb-1">No QR codes match</p>
                <p className="text-xs text-muted-foreground">
                  {search ? "Try a different search term" : "Create your first one"}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <div className="space-y-4 xl:sticky xl:top-0">
        {selectedQr ? (
          <>
            <QrPreview title={selectedQr.title} url={selectedQr.url} />
            <Card>
              <CardHeader className="border-b">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground mb-1">
                    Selected
                  </p>
                  <CardTitle className="truncate">
                    {selectedQr.title || "Untitled QR"}
                  </CardTitle>
                </div>
                <CardAction>
                  <Link
                    to="/q/$qrId"
                    params={{ qrId: selectedQr.id }}
                    className="text-xs text-muted-foreground hover:text-foreground font-medium flex items-center gap-1 shrink-0"
                  >
                    Edit <ArrowRight className="size-3" />
                  </Link>
                </CardAction>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-xs font-mono text-muted-foreground break-all leading-relaxed">
                  {selectedQr.url}
                </p>
              </CardContent>
            </Card>
            <ParsedUrlPanel url={selectedQr.url} />
          </>
        ) : (
          <Card>
            <CardContent className="py-10 text-center space-y-4">
              <div className="inline-flex size-14 rounded-md border items-center justify-center">
                <Plus className="size-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm mb-1">Empty vault</p>
                <p className="text-xs text-muted-foreground">
                  {search ? "No matching QR for current search" : "Create your first deep-link QR"}
                </p>
              </div>
              <Link to="/new" search={{ url: "" }}>
                <Button type="button">
                  <Plus /> Create QR
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

type FilterChipProps = {
  icon: React.ReactNode;
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
};

function FilterChip({ icon, label, count, active, onClick }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
        active
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
      )}
    >
      <span className="flex items-center gap-2 min-w-0">
        <span className="shrink-0">{icon}</span>
        <span className="truncate">{label}</span>
      </span>
      <Badge variant={active ? "secondary" : "outline"}>{count}</Badge>
    </button>
  );
}
