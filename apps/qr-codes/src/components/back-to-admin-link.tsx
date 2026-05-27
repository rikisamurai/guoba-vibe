"use client";

import { useSyncExternalStore, type MouseEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

function isModifiedClick(event: MouseEvent<HTMLAnchorElement>) {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
}

const subscribe = () => () => {};

function useEnteredFromAdmin(qrId: string) {
  return useSyncExternalStore(
    subscribe,
    () => sessionStorage.getItem(`qr:return:${qrId}`)?.startsWith("/admin") ?? false,
    () => false,
  );
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
  const enteredFromAdmin = useEnteredFromAdmin(qrId);

  if (!enteredFromAdmin) return null;

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (isModifiedClick(event)) return;
    sessionStorage.removeItem(`qr:return:${qrId}`);
    event.preventDefault();
    router.back();
  }

  return (
    <Link href="/admin" className={className} onClick={handleClick}>
      {children}
    </Link>
  );
}
