import { AlertCircle, Check } from "lucide-react";
import { parseDeepLink } from "@/lib/url";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type ParsedUrlPanelProps = {
  url: string;
};

export function ParsedUrlPanel({ url }: ParsedUrlPanelProps) {
  const parsed = parseDeepLink(url);
  const queryEntries = Object.entries(parsed.query);

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Parsed URL</CardTitle>
        <CardAction>
          <Badge variant="outline" className="gap-1.5">
            {parsed.isValid ? <Check className="size-3" /> : <AlertCircle className="size-3" />}
            {parsed.isValid ? "valid" : "invalid"}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="grid grid-cols-[60px_1fr] gap-x-3 gap-y-2 text-sm">
          <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground pt-0.5">
            scheme
          </span>
          <span className="font-mono text-xs text-foreground break-all">
            {parsed.scheme || "—"}
          </span>
          <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground pt-0.5">
            path
          </span>
          <span className="font-mono text-xs text-foreground break-all">{parsed.path || "—"}</span>
        </div>

        <Separator />

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">
              query params
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">
              {queryEntries.length} {queryEntries.length === 1 ? "key" : "keys"}
            </span>
          </div>
          {queryEntries.length ? (
            <div className="grid gap-1">
              {queryEntries.map(([key, value]) => (
                <div
                  key={key}
                  className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-2 px-2 py-1.5 rounded-md bg-muted/50 text-xs"
                >
                  <code className="font-mono text-foreground truncate" title={key}>
                    {key}
                  </code>
                  <code className="font-mono text-muted-foreground truncate" title={value}>
                    {value || '""'}
                  </code>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic px-2 py-3 text-center border border-dashed rounded-md">
              no query params
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
