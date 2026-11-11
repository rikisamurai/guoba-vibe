import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { LessonMeta } from '../components/lesson-meta'
import { Pipeline } from '../components/pipeline'

afterEach(() => vi.unstubAllEnvs())

describe('static Markdown rendering', () => {
  it('exports every pipeline stage with inputs, outputs and explanations', () => {
    vi.stubEnv('SSG_MD', 'true')
    vi.stubEnv('PUBLIC_LAB_ORIGIN', 'https://lab.example.test')
    const html = renderToStaticMarkup(createElement(Pipeline))

    expect(html).toContain('<h2>文字从网络到屏幕的旅程</h2>')
    const headings = [...html.matchAll(/<h3>(.*?)<\/h3>/g)].map((match) => match[1])
    expect(headings).toEqual([
      '1. HTTP 响应体',
      '2. UTF-8 解码',
      '3. SSE 解析',
      '4. 提取正文',
      '5. 更新界面',
    ])
    expect(html.match(/<p>输入：/g)).toHaveLength(5)
    expect(html.match(/<pre><code>/g)).toHaveLength(5)
    expect(html).toContain('保留同一个解码器，跨片段拼出完整字符。')
    expect(html).toContain('一次读取可以没有事件，也可以有多条事件。')
    expect(html).toContain('读取 index 为 0 的 choice.delta.content')
    expect(html).toContain('状态更新、React commit、浏览器绘制是不同阶段。')
    expect(html).toContain('已收到：你好 / 已显示：你好')
    expect(html).toContain(
      'href="https://lab.example.test/playground?demo=network-inspector&amp;source=mine"',
    )
    expect(html).not.toContain('<button')
  })

  it('exports lesson metadata as separated heading and list entries', () => {
    vi.stubEnv('SSG_MD', 'true')
    const html = renderToStaticMarkup(
      createElement(LessonMeta, {
        duration: '20 分钟',
        exercise: '修复中文拆包',
        prerequisites: ['fetch', 'ReadableStream'],
      }),
    )
    expect(html).toContain('<h2>本章学习信息</h2><ul>')
    expect(html).toContain('<li><strong>预计时间：</strong>20 分钟</li>')
    expect(html).toContain('<li><strong>你会完成：</strong>修复中文拆包</li>')
    expect(html).toContain('<li><strong>前置知识：</strong>fetch + ReadableStream</li>')
    expect(html).not.toContain('<dl')
  })

  it('keeps interactive controls and the original metadata layout for web rendering', () => {
    vi.stubEnv('SSG_MD', '')
    const pipeline = renderToStaticMarkup(createElement(Pipeline))
    const metadata = renderToStaticMarkup(
      createElement(LessonMeta, {
        duration: '20 分钟',
        exercise: '修复中文拆包',
        prerequisites: ['fetch'],
      }),
    )
    expect(pipeline.match(/<button /g)).toHaveLength(5)
    expect(pipeline.match(/<pre>/g)).toHaveLength(1)
    expect(pipeline).toContain('class="course-pipeline"')
    expect(metadata).toContain('<dl class="lesson-meta"')
    expect(metadata.match(/<dt>/g)).toHaveLength(3)
    expect(metadata).not.toContain('<h2>')
  })
})
