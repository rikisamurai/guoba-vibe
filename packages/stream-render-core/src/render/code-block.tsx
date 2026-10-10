import { useEffect, useState } from 'react'

/**
 * 重型节点通道之一：代码块。
 * 素排立即可见（不阻塞流），Shiki 高亮走自己的时钟——
 * streaming 中 150ms debounce，闭合/final 时立即出全量。
 */
export interface CodeBlockProps {
  code: string
  lang: string
  closed: boolean
  final: boolean
}

async function highlight(code: string, lang: string): Promise<string> {
  const { codeToHtml } = await import('shiki')
  try {
    return await codeToHtml(code, { lang: lang || 'text', theme: 'github-dark' })
  } catch {
    return await codeToHtml(code, { lang: 'text', theme: 'github-dark' })
  }
}

export function CodeBlock({ code, lang, closed, final }: CodeBlockProps) {
  const [result, setResult] = useState<{ html: string; forCode: string } | null>(null)

  useEffect(() => {
    let alive = true
    const run = () =>
      void highlight(code, lang).then((html) => {
        if (alive) setResult({ html, forCode: code })
      })
    if (closed || final) {
      run()
      return () => {
        alive = false
      }
    }
    const timer = setTimeout(run, 150)
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [code, lang, closed, final])

  // 高亮结果落后于最新代码时，回退素排——宁可无色也不显示旧内容
  if (result === null || result.forCode !== code) {
    return (
      <pre>
        <code>{code}</code>
      </pre>
    )
  }
  return <div dangerouslySetInnerHTML={{ __html: result.html }} />
}
