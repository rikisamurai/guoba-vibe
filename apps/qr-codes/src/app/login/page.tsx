"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { signIn, signOut } from "@/auth/client";

function ForbiddenNotice() {
  const params = useSearchParams();
  if (params.get("reason") !== "forbidden") return null;
  return (
    <div className="rounded-md border border-amber-500/40 bg-amber-50 dark:bg-amber-950/20 px-4 py-3 text-sm max-w-md">
      You are signed in with a GitHub account that is not authorized. Sign out and try a different account.
    </div>
  );
}

function LoginForm() {
  const [pending, setPending] = useState(false);

  const handleSignIn = async () => {
    setPending(true);
    try {
      await signIn.social({ provider: "github", callbackURL: "/admin" });
    } catch (err) {
      console.error(err);
      toast.error("Sign-in failed. Try again.");
      setPending(false);
    }
    // On success the browser navigates away; no need to reset pending.
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <Button onClick={handleSignIn} disabled={pending}>
        {pending ? "Redirecting…" : "Continue with GitHub"}
      </Button>
      <Button variant="ghost" size="sm" onClick={() => signOut()}>
        Sign out
      </Button>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 px-6">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <Suspense fallback={null}>
        <ForbiddenNotice />
      </Suspense>
      <LoginForm />
    </main>
  );
}
