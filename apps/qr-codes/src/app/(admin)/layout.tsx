import { asc } from "drizzle-orm";
import { requireAdmin } from "@/auth/admin";
import { db } from "@/db/client";
import { collections } from "@/db/schema";
import { Sidebar } from "@/components/sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  const cols = await db
    .select({ id: collections.id, title: collections.title })
    .from(collections)
    .orderBy(asc(collections.title));

  return (
    <div className="min-h-screen flex">
      <Sidebar collections={cols} />
      <main className="flex-1 p-6 overflow-x-hidden">{children}</main>
    </div>
  );
}
