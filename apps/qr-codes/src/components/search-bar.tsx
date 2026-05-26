"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";

function SearchBarInner() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get("q") ?? "");

  useEffect(() => {
    const t = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set("q", value);
      else next.delete("q");
      router.replace(`${pathname}?${next.toString()}`);
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <Input
      placeholder="Search title, url, description…"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      className="max-w-md"
    />
  );
}

export function SearchBar() {
  return (
    <Suspense fallback={<Input placeholder="Search…" disabled className="max-w-md" />}>
      <SearchBarInner />
    </Suspense>
  );
}
