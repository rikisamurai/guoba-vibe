'use client'

import { useSyncExternalStore, type MouseEvent, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

function isModifiedClick(event: MouseEvent<HTMLAnchorElement>) {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0
}

const subscribe = () => () => {}

function useEnteredFromAdmin(qrId: string) {
  return useSyncExternalStore(
    subscribe,
    () => sessionStorage.getItem(`qr:return:${qrId}`)?.startsWith('/admin') ?? false,
    () => false,
  )
}

export function BackToAdminLink({
  qrId,
  className,
  children,
}: {
  qrId: string
  className?: string
  children: ReactNode
}) {
  const { back } = useRouter()
  const enteredFromAdmin = useEnteredFromAdmin(qrId)

  if (!enteredFromAdmin) return null

  function returnToAdmin(event: MouseEvent<HTMLAnchorElement>) {
    if (isModifiedClick(event)) return
    sessionStorage.removeItem(`qr:return:${qrId}`)
    event.preventDefault()
    back()
  }

  return (
    <Link href="/admin" className={className} onClick={returnToAdmin}>
      {children}
    </Link>
  )
}
