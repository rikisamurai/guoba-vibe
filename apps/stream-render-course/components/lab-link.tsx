import type { ReactNode } from 'react'

export function LabLink({ path, children }: { path: string; children: ReactNode }) {
  const origin = import.meta.env.PUBLIC_LAB_ORIGIN ?? 'http://localhost:5174'
  return <a href={`${new URL(origin).origin}${path}`}>{children}</a>
}
