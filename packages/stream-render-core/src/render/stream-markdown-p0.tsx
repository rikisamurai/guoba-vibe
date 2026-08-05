import { useMemo } from 'react'

import { md } from './markdown'

export interface StreamMarkdownP0Props {
  text: string
  className?: string
}

/**
 * P0 基线渲染器：每次提交对全文做整体 reparse + innerHTML 替换。
 * 短消息完全够用；它的性能崩溃点（长文、每次提交全量重建 DOM）
 * 正是 P1 稳定前缀 + dirty tail 存在的理由——保留它用于前后对比。
 */
export function StreamMarkdownP0({ text, className }: StreamMarkdownP0Props) {
  const html = useMemo(() => md.render(text), [text])
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />
}
