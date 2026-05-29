import { PencilIcon } from 'lucide-react'
import Link from 'next/link'

import { QrCardLink } from '@/components/qr-card-link'
import { renderSvg } from '@/lib/qr'

export async function QrCard({
  id,
  title,
  url,
  returnHref,
  editable = false,
}: {
  id: string
  title: string
  url: string
  returnHref?: string
  editable?: boolean
}) {
  const svg = await renderSvg(url, { width: 256, margin: 1 })
  return (
    <div className="relative">
      <QrCardLink
        id={id}
        href={`/q/${id}`}
        returnHref={returnHref}
        className="block rounded-lg border p-4 transition hover:shadow-md"
      >
        <div
          className="mx-auto aspect-square w-full max-w-[180px] [&_svg]:h-full [&_svg]:w-full"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <h3 className="mt-3 truncate font-medium">{title}</h3>
        <p
          className={`text-muted-foreground mt-1 truncate font-mono text-xs ${
            editable ? 'pr-8' : ''
          }`}
        >
          {url}
        </p>
      </QrCardLink>
      {editable && (
        <Link
          href={`/admin/qrs/${id}/edit`}
          aria-label="编辑"
          title="编辑"
          className="text-muted-foreground hover:bg-muted hover:text-foreground absolute right-3 bottom-3 z-10 rounded-md p-1.5"
        >
          <PencilIcon className="size-4" />
        </Link>
      )}
    </div>
  )
}
