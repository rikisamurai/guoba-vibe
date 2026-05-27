"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function AdminEditButton({ qrId }: { qrId: string }) {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/admin-status", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { isAdmin: false }))
      .then((data) => {
        if (alive) setIsAdmin(Boolean(data.isAdmin));
      })
      .catch(() => {
        if (alive) setIsAdmin(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (!isAdmin) return null;

  return (
    <Button asChild size="sm" variant="outline">
      <Link href={`/admin/qrs/${qrId}/edit`}>编辑</Link>
    </Button>
  );
}
