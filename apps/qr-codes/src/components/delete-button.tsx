"use client";

import { useTransition } from "react";
// Internal import; isRedirectError is not publicly exported in Next 16.2.6.
// If this breaks on a future minor, fall back to `err instanceof Error && err.message === "NEXT_REDIRECT"`.
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function DeleteButton({
  action,
  label,
  confirmMessage,
}: {
  action: () => Promise<void>;
  label: string;
  confirmMessage: string;
}) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="destructive"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(confirmMessage)) return;
        start(async () => {
          try {
            await action();
          } catch (err) {
            if (isRedirectError(err)) throw err;
            toast.error(err instanceof Error ? err.message : "Delete failed");
          }
        });
      }}
    >
      {pending ? "Deleting…" : label}
    </Button>
  );
}
