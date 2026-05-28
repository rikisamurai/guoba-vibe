import { requireAdmin } from "@/auth/admin";
import { listCollections } from "@/data/collections";
import { Sidebar } from "@/components/sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const cols = await listCollections();

  return (
    <div className="min-h-screen flex">
      <Sidebar collections={cols} />
      <main className="flex-1 p-6 overflow-x-hidden">{children}</main>
    </div>
  );
}
