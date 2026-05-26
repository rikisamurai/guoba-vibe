"use client";

import { Button } from "@/components/ui/button";
import { signIn } from "@/auth/client";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 px-6">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <Button
        onClick={() => signIn.social({ provider: "github", callbackURL: "/admin" })}
      >
        Continue with GitHub
      </Button>
    </main>
  );
}
