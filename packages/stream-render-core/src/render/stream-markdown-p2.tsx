import { memo, useEffect, useMemo, useRef, useState } from 'react'

import { splitBlocks } from '../parse/blocks'
import type { MdBlock } from '../parse/blocks'
import { remendTail } from '../parse/remend'
import { createDisplayScheduler } from '../schedule/display-scheduler'
import type { DisplayScheduler } from '../schedule/display-scheduler'
import { CodeBlock } from './code-block'
import { md } from './markdown'
import { MermaidBlock } from './mermaid-block'

export interface StreamMarkdownP2Props {
  text: string
  streaming?: boolean
  className?: string
  /** Mermaid 流式渲染实验开关（默认围栏闭合后才渲染） */
  mermaidLive?: boolean
}

const HtmlBlock = memo(function HtmlBlock({ html }: { html: string }) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />
})

/** 从围栏块文本里取出代码体（去掉开栏行，闭合时再去掉闭栏行） */
function fenceCode(block: MdBlock): string {
  const lines = block.text.split('\n')
  return (block.closed ? lines.slice(1, -1) : lines.slice(1)).join('\n')
}

/**
 * P2 = P1 管线 + 重型节点独立通道：
 * 代码围栏交给 Shiki（debounce 高亮），mermaid 围栏交给 MermaidBlock
 * （默认闭合后渲染 / live 实验模式），其余块沿用稳定前缀缓存。
 */
export function StreamMarkdownP2({
  text,
  streaming = false,
  className,
  mermaidLive = false,
}: StreamMarkdownP2Props) {
  const [visible, setVisible] = useState('')
  const [drained, setDrained] = useState(false)
  const schedulerRef = useRef<DisplayScheduler | null>(null)
  const fedRef = useRef(0)

  useEffect(() => {
    schedulerRef.current ??= createDisplayScheduler({
      onEmit: setVisible,
      onDrained: () => setDrained(true),
    })
    if (text.length > fedRef.current) {
      schedulerRef.current.push(text.slice(fedRef.current))
      fedRef.current = text.length
    }
  }, [text])

  useEffect(() => {
    if (!streaming && schedulerRef.current) schedulerRef.current.finish()
  }, [streaming])

  useEffect(() => () => schedulerRef.current?.dispose(), [])

  const final = !streaming && (drained || fedRef.current === 0)
  const source = final ? text : visible

  const cacheRef = useRef<{ texts: string[]; htmls: string[] }>({ texts: [], htmls: [] })
  const blocks = useMemo(() => splitBlocks(source), [source])

  return (
    <div className={className}>
      {blocks.map((block, i) => {
        const dirty = i === blocks.length - 1 && !final
        if (block.fence) {
          const code = fenceCode(block)
          if (block.lang === 'mermaid') {
            return (
              <MermaidBlock
                key={i}
                code={code}
                closed={block.closed}
                final={final}
                live={mermaidLive}
              />
            )
          }
          return (
            <CodeBlock key={i} code={code} lang={block.lang} closed={block.closed} final={final} />
          )
        }

        const cache = cacheRef.current
        let html: string
        if (!dirty && cache.texts[i] === block.text) {
          html = cache.htmls[i]
        } else {
          html = md.render(dirty ? remendTail(block.text) : block.text)
          if (!dirty) {
            cache.texts[i] = block.text
            cache.htmls[i] = html
          }
        }
        return <HtmlBlock key={i} html={html} />
      })}
    </div>
  )
}
