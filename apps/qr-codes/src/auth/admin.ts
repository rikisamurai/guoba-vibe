import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { auth } from "@/auth/server";
import { db } from "@/db/client";
import * as schema from "@/db/schema";
import { env } from "@/env";

export async function getAdminSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  // Look up the github account row to read the provider-side account id
  const rows = await db
    .select({ accountId: schema.account.accountId })
    .from(schema.account)
    .where(
      and(eq(schema.account.userId, session.user.id), eq(schema.account.providerId, "github"))
    )
    .limit(1);

  const githubId = rows[0]?.accountId;
  if (!githubId || githubId !== env.ADMIN_GITHUB_ID) return null;
  return session;
}

export async function requireAdmin() {
  const session = await getAdminSession();
  if (!session) redirect("/login");
  return session;
}
