import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'

import { parseFenceContent } from '../../engine/fence-content'
import { highlightCode } from '../../lib/shiki'
import type { Block } from '../../types/block'

/**
 * M3 code path: while the fence is open the code shows as plain text with a
 * streaming hint; once closed (content can no longer change) Shiki highlights
 * it exactly once. Grammars load lazily and the highlighter is a singleton.
 */
export function CodeBlock({ block }: { block: Block }) {
  const fence = block.fence ?? { lang: '', closed: false }
  const { lang, code, closed } = parseFenceContent(block.raw, fence)
  const [html, setHtml] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    if (closed) {
      highlightCode(code, lang)
        .then((result) => {
          if (!cancelled && result !== null) setHtml(result)
        })
        .catch(() => {
          // plain rendering stays — highlighting is an enhancement
        })
    }
    return () => {
      cancelled = true
    }
  }, [closed, code, lang])

  return (
    <div className="border-seam bg-panel mb-3 overflow-hidden rounded-[10px] border">
      <div className="border-seam text-faint flex items-center justify-between border-b px-3.5 py-2 font-mono text-[10.5px] tracking-[0.1em] uppercase">
        <span>{lang === '' ? 'code' : lang}</span>
        {closed ? (
          <span>{html === null ? 'plain' : 'shiki'}</span>
        ) : (
          <span className="text-pulse flex items-center gap-1.5">
            <Loader2 className="size-3 animate-spin" />
            streaming
          </span>
        )}
      </div>
      {html === null ? (
        <pre className="overflow-x-auto p-3.5 font-mono text-[12.5px] leading-relaxed">
          <code>{code}</code>
        </pre>
      ) : (
        <div
          className="shiki-block overflow-x-auto text-[12.5px] leading-relaxed"
          // Shiki output is generated markup from escaped code text
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
    </div>
  )
}
