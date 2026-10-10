import { memo, useEffect, useMemo, useRef, useState } from 'react'

import { splitBlocks } from '../parse/blocks'
import { remendFence, remendTail } from '../parse/remend'
import { createDisplayScheduler } from '../schedule/display-scheduler'
import type { DisplayScheduler } from '../schedule/display-scheduler'
import { md } from './markdown'

export interface StreamMarkdownP1Props {
  text: string
  /** 流仍在进行；false 时排空缓冲并做 final parse（不再修补） */
  streaming?: boolean
  className?: string
}

/** html 不变时 React.memo 短路，稳定块的 DOM 完全不被触碰 */
const Block = memo(function Block({ html }: { html: string }) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />
})

/**
 * P1 渲染器 = 显示调度器 + 块级切分 + 稳定前缀缓存 + 尾部修补。
 * 与 P0 同签名，可在渲染器下拉里直接切换对比。
 */
export function StreamMarkdownP1({ text, streaming = false, className }: StreamMarkdownP1Props) {
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

  // final：排空完成后改用 rawText 全文（去掉一切假闭合的收口时刻）
  const final = !streaming && (drained || fedRef.current === 0)
  const source = final ? text : visible
  const htmls = useBlockHtmls(source, final)

  return (
    <div className={className}>
      {htmls.map((html, i) => (
        <Block key={i} html={html} />
      ))}
    </div>
  )
}

/** 稳定前缀缓存：除 dirty 尾块外，同文本的块直接复用上次的 HTML */
function useBlockHtmls(source: string, final: boolean): string[] {
  const cacheRef = useRef<{ texts: string[]; htmls: string[] }>({ texts: [], htmls: [] })
  return useMemo(() => {
    const blocks = splitBlocks(source)
    const cache = cacheRef.current
    const out = blocks.map((block, i) => {
      const dirty = i === blocks.length - 1 && !final
      if (!dirty && cache.texts[i] === block.text) return cache.htmls[i]

      let renderText = block.text
      if (dirty) {
        renderText = block.fence && !block.closed ? remendFence(block.text) : remendTail(block.text)
      }
      const html = md.render(renderText)
      if (!dirty) {
        cache.texts[i] = block.text
        cache.htmls[i] = html
      }
      return html
    })
    cache.texts.length = blocks.length
    cache.htmls.length = blocks.length
    return out
  }, [source, final])
}
