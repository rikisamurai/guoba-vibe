import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowRight, FolderOpen, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useVault } from "@/app/use-vault";
import { cn } from "@/lib/utils";
import { parseDeepLink } from "@/lib/url";
import { getQrsForCollection } from "@/lib/vault";
import { upsertCollection } from "@/lib/storage";
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

export function CollectionsPage() {
  const { data, updateVault } = useVault();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const collectionId = pathname.startsWith("/collections/")
    ? decodeURIComponent(pathname.slice("/collections/".length))
    : "";
  const selectedCollection = data.collections.find((collection) => collection.id === collectionId);
  useDocumentTitle(
    selectedCollection ? `${selectedCollection.title} · Collections` : "Collections",
  );
  const qrs = selectedCollection ? getQrsForCollection(data, selectedCollection.id) : data.qrs;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    setTitle(selectedCollection?.title ?? "");
    setDescription(selectedCollection?.description ?? "");
  }, [selectedCollection?.id, selectedCollection?.title, selectedCollection?.description]);

  function saveCollection() {
    if (!title.trim()) return;
    updateVault((current) =>
      upsertCollection(current, { id: selectedCollection?.id, title, description }),
    );
    if (!selectedCollection) {
      setTitle("");
      setDescription("");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider font-medium text-muted-foreground mb-1">
            Workspace
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Collections</h1>
        </div>
        <Link
          to="/"
          className="text-xs text-muted-foreground hover:text-foreground font-medium flex items-center gap-1"
        >
          Back to vault <ArrowRight className="size-3" />
        </Link>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[220px_minmax(0,1fr)_minmax(0,1fr)] gap-4 items-start">
        <Card>
          <CardHeader className="border-b">
            <CardTitle>All folders</CardTitle>
            <CardAction>
              <Badge variant="outline">{data.collections.length}</Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-1 pt-4">
            {data.collections.map((collection) => {
              const isActive = collection.id === collectionId;
              return (
                <Link
                  key={collection.id}
                  to="/collections/$collectionId"
                  params={{ collectionId: collection.id }}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors truncate",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                  )}
                >
                  <FolderOpen className="size-3.5 shrink-0" />
                  <span className="truncate">{collection.title}</span>
                </Link>
              );
            })}
            {!data.collections.length && (
              <p className="text-xs text-muted-foreground italic px-3 py-4 text-center border border-dashed rounded-md">
                no collections yet
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <div>
              <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground mb-1">
                {selectedCollection ? "Edit" : "Create"}
              </p>
              <CardTitle>
                {selectedCollection ? selectedCollection.title : "New collection"}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid gap-1.5">
              <FieldLabel htmlFor="coll-title">Title</FieldLabel>
              <Input
                id="coll-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. Mobile onboarding"
              />
            </div>
            <div className="grid gap-1.5">
              <FieldLabel htmlFor="coll-desc">Description</FieldLabel>
              <Textarea
                id="coll-desc"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
                placeholder="Optional context for this collection"
              />
            </div>
            <Button type="button" onClick={saveCollection} disabled={!title.trim()}>
              <Save /> Save collection
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <div>
              {selectedCollection && (
                <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground mb-1">
                  QRs in collection
                </p>
              )}
              <CardTitle>{selectedCollection?.title ?? "All QR codes"}</CardTitle>
            </div>
            <CardAction>
              <Badge variant="secondary">{qrs.length}</Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-2 pt-4">
            {qrs.length ? (
              qrs.map((qr) => {
                const parsed = parseDeepLink(qr.url);
                return (
                  <Link
                    key={qr.id}
                    to="/q/$qrId"
                    params={{ qrId: qr.id }}
                    className="block p-3 rounded-md border bg-card hover:bg-muted/50 transition-colors group"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={cn(
                          "size-1.5 rounded-full shrink-0",
                          parsed.isValid ? "bg-foreground" : "bg-muted-foreground",
                        )}
                      />
                      <strong className="text-sm font-medium truncate group-hover:underline">
                        {qr.title || parsed.path || qr.url}
                      </strong>
                    </div>
                    <p className="text-xs font-mono text-muted-foreground truncate pl-3.5">
                      {parsed.path || qr.url}
                    </p>
                  </Link>
                );
              })
            ) : (
              <p className="text-xs text-muted-foreground italic px-3 py-6 text-center border border-dashed rounded-md">
                no QR codes in this collection
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
