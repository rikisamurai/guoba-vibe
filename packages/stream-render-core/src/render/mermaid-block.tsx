import { useEffect, useId, useRef, useState } from 'react'

/**
 * 重型节点通道之二：Mermaid 图表。
 * 默认策略：streaming 中只显示源码 + 状态标记，围栏闭合后一次性渲染
 * （文档警告的坑：每行重布局导致图表反复重排闪烁）。
 * live 实验开关：streaming 中 400ms debounce 尝试渲染，parse 失败保持上一帧。
 */
export interface MermaidBlockProps {
  code: string
  closed: boolean
  final: boolean
  live?: boolean
}

let initialized = false

async function renderMermaid(id: string, code: string): Promise<string> {
  const { default: mermaid } = await import('mermaid')
  if (!initialized) {
    // strict：图表内的 click 绑定与危险内容被禁用——模型输出不可信
    mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'dark' })
    initialized = true
  }
  const { svg } = await mermaid.render(id, code)
  return svg
}

export function MermaidBlock({ code, closed, final, live = false }: MermaidBlockProps) {
  const [svg, setSvg] = useState<string | null>(null)
  const attemptRef = useRef(0)
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')

  const settled = closed || final
  useEffect(() => {
    if (!settled && !live) return
    let alive = true
    const run = () =>
      void renderMermaid(`mmd${uid}${++attemptRef.current}`, code)
        .then((s) => {
          if (alive) setSvg(s)
        })
        .catch(() => {
          // 半截图定义 parse 失败是常态：保持上一帧
        })
    if (settled) {
      run()
      return () => {
        alive = false
      }
    }
    const timer = setTimeout(run, 400)
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [code, settled, live, uid])

  if (svg !== null && (settled || live)) {
    return <div dangerouslySetInnerHTML={{ __html: svg }} />
  }
  return (
    <div>
      <pre>
        <code>{code}</code>
      </pre>
      {!settled && <p style={{ opacity: 0.5, fontSize: '0.8em' }}>◌ 图表生成中…</p>}
    </div>
  )
}
