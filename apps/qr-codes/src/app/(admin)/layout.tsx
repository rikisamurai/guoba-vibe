import { requireAdmin } from '@/auth/admin'
import { Sidebar } from '@/components/sidebar'
import { listCollections } from '@/data/collections'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin()
  const cols = await listCollections()

  return (
    <div className="flex min-h-screen">
      <Sidebar collections={cols} />
      <main className="flex-1 overflow-x-hidden p-6">{children}</main>
    </div>
  )
}
