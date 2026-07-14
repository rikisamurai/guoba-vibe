import { CircleAlert } from 'lucide-react'

import type { ResolveErrorCode } from '../../lib/types'

const MESSAGES: Record<ResolveErrorCode, string> = {
  invalid_link: "That doesn't look like a post link",
  restricted: "This post is restricted or deleted — can't fetch it",
  no_video: 'No videos in this post',
  upstream: "X's API hiccuped — try again",
}

export function ErrorBanner({ code }: { code: ResolveErrorCode }) {
  return (
    <p className="border-scorch/40 bg-scorch/10 text-scorch-soft animate-fade-in mt-4 flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm text-pretty">
      <CircleAlert className="text-scorch size-4 shrink-0" aria-hidden />
      {MESSAGES[code]}
    </p>
  )
}
