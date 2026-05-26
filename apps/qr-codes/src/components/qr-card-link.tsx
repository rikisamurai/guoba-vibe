"use client";

import type { MouseEvent, ReactNode } from "react";
import Link from "next/link";

function isModifiedClick(event: MouseEvent<HTMLAnchorElement>) {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
}

export function QrCardLink({
  id,
  href,
  returnHref,
  className,
  children,
}: {
  id: string;
  href: string;
  returnHref?: string;
  className?: string;
  children: ReactNode;
}) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (isModifiedClick(event)) return;

    const key = `qr:return:${id}`;
    if (returnHref) sessionStorage.setItem(key, returnHref);
    else sessionStorage.removeItem(key);
  }

  return (
    <Link href={href} className={className} onClick={handleClick}>
      {children}
    </Link>
  );
}
