import { requireAdmin } from '@/auth/admin'
import { Sidebar } from '@/components/sidebar'
import { getCollectionNav } from '@/data/collections'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin()
  const nav = await getCollectionNav()

  return (
    <div className="flex min-h-screen">
      <Sidebar nav={nav} />
      <main className="flex-1 overflow-x-hidden p-6">{children}</main>
    </div>
  )
}
