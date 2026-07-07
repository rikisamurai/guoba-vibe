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
    <p className="mt-4 flex items-center gap-2 rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2.5 text-sm text-red-300">
      <CircleAlert className="size-4 shrink-0" aria-hidden />
      {MESSAGES[code]}
    </p>
  )
}
