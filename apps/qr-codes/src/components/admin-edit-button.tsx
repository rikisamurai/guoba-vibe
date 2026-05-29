'use client'

import Link from 'next/link'
import { useSyncExternalStore } from 'react'

import { Button } from '@/components/ui/button'

const subscribe = () => () => {}

function useEnteredFromAdmin(qrId: string) {
  return useSyncExternalStore(
    subscribe,
    () => sessionStorage.getItem(`qr:return:${qrId}`)?.startsWith('/admin') ?? false,
    () => false,
  )
}

export function AdminEditButton({ qrId, className }: { qrId: string; className?: string }) {
  const enteredFromAdmin = useEnteredFromAdmin(qrId)

  if (!enteredFromAdmin) return null

  return (
    <Button asChild size="sm" variant="ghost" className={className}>
      <Link href={`/admin/qrs/${qrId}/edit`}>Edit</Link>
    </Button>
  )
}
