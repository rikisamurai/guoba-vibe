'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

function SearchBarInner() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [value, setValue] = useState(params.get('q') ?? '')

  useEffect(() => {
    const t = setTimeout(() => {
      // Read current URL at fire-time, not the snapshot captured at render.
      const current = new URLSearchParams(window.location.search)
      if (value) current.set('q', value)
      else current.delete('q')
      const next = current.toString()
      router.replace(next ? `${pathname}?${next}` : pathname)
    }, 250)
    return () => clearTimeout(t)
  }, [value, pathname, router])

  return (
    <div className="flex w-full max-w-md items-center gap-2">
      <Input
        placeholder="Search title, URL, query, description…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="min-w-0"
      />
      {value && (
        <Button type="button" variant="ghost" size="sm" onClick={() => setValue('')}>
          Clear
        </Button>
      )}
    </div>
  )
}

export function SearchBar() {
  return (
    <Suspense fallback={<Input placeholder="Search…" disabled className="max-w-md" />}>
      <SearchBarInner />
    </Suspense>
  )
}
