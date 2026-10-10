import { Loader2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { parseFenceContent } from '../../engine/fence-content'
import type { HeavyGate } from '../../engine/heavy-gate'
import { createHeavyGate } from '../../engine/heavy-gate'
import type { Block } from '../../types/block'

async function renderMermaid(source: string, domId: string): Promise<string> {
  const { default: mermaid } = await import('mermaid')
  mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'dark' })
  const { svg } = await mermaid.render(domId, source)
  return svg
}

/**
 * M3 diagram path: attempts are debounced (~300ms), failures keep the last
 * successful SVG (mid-stream sources are unparseable by design), and the
 * closed fence triggers one final render.
 */
export function MermaidBlock({ block }: { block: Block }) {
  const fence = block.fence ?? { lang: 'mermaid', closed: false }
  const { code, closed } = parseFenceContent(block.raw, fence)
  const [svg, setSvg] = useState<string | null>(null)
  const gateRef = useRef<HeavyGate | null>(null)
  const domId = `mmd-${block.id.replaceAll(/[^a-zA-Z0-9]/g, '-')}`

  useEffect(() => {
    const gate = createHeavyGate({
      delayMs: 300,
      render: (source, attempt) => renderMermaid(source, `${domId}-${attempt}`),
      onSuccess: setSvg,
    })
    gateRef.current = gate
    return () => gate.dispose()
  }, [domId])

  useEffect(() => {
    gateRef.current?.push(code)
    if (closed) gateRef.current?.flush()
  }, [code, closed])

  return (
    <div className="border-seam bg-panel mb-3 overflow-hidden rounded-[10px] border">
      <div className="border-seam text-faint flex items-center justify-between border-b px-3.5 py-2 font-mono text-[10.5px] tracking-[0.1em] uppercase">
        <span>mermaid</span>
        {closed && svg !== null ? (
          <span>settled</span>
        ) : (
          <span className="text-pulse flex items-center gap-1.5">
            <Loader2 className="size-3 animate-spin" />
            {svg === null ? 'waiting for a parseable diagram' : 'updating'}
          </span>
        )}
      </div>
      {svg === null ? (
        <pre className="text-mute overflow-x-auto p-3.5 font-mono text-[12px] leading-relaxed">
          <code>{code}</code>
        </pre>
      ) : (
        <div
          className="bg-panel-2/40 flex justify-center p-4 [&_svg]:max-w-full"
          // mermaid runs with securityLevel strict; output is its own SVG
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      )}
    </div>
  )
}
