import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { getAdminSession } from '@/auth/admin'

export default async function HomePage() {
  const session = await getAdminSession()
  if (session) redirect('/admin')

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-3xl font-semibold">QR Codes</h1>
      <p className="text-muted-foreground max-w-md">
        Personal vault for mobile-app deep-link QR codes. Sign in to manage; share /q/&lt;id&gt;
        links to anyone with a phone.
      </p>
      <Button asChild>
        <Link href="/login">Continue with GitHub</Link>
      </Button>
    </main>
  )
}
