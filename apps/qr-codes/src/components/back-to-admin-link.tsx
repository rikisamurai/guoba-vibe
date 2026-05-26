"use client";

import type { MouseEvent, ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

function isModifiedClick(event: MouseEvent<HTMLAnchorElement>) {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
}

export function BackToAdminLink({
  qrId,
  className,
  children,
}: {
  qrId: string;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (isModifiedClick(event)) return;

    const key = `qr:return:${qrId}`;
    const returnHref = sessionStorage.getItem(key);
    if (!returnHref?.startsWith("/admin")) return;

    event.preventDefault();
    sessionStorage.removeItem(key);
    router.back();
  }

  return (
    <Link href="/admin" className={className} onClick={handleClick}>
      {children}
    </Link>
  );
}
