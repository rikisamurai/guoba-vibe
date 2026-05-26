"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UrlPreview } from "@/components/url-preview";

export function UrlEditor({
  name = "url",
  defaultValue = "",
  required = true,
}: {
  name?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  const [value, setValue] = useState(defaultValue);
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>URL</Label>
      <Input
        id={name}
        name={name}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="xhsdiscover://rn/wakanda/buyer-conversion?sku_id=1"
        required={required}
        className="font-mono"
      />
      <div className="rounded-md border bg-muted/30 p-3">
        {value ? (
          <UrlPreview url={value} />
        ) : (
          <p className="text-sm text-muted-foreground italic">Paste a URL to preview…</p>
        )}
      </div>
    </div>
  );
}
