import { useState } from 'react'

import { LabLink } from './lab-link'

const stages = [
  {
    title: 'HTTP 响应体',
    input: '服务端持续发送字节',
    output: 'Uint8Array [100, 97, 116, 97, 58, …]',
    note: '一次请求可以有持续到达的响应体；不是每段都重新发请求。',
  },
  {
    title: 'UTF-8 解码',
    input: '任意切分的字节',
    output: 'data: {"choices":[{"index":0,"delta":{"content":"你好"}}]}↵↵',
    note: '保留同一个解码器，跨片段拼出完整字符。',
  },
  {
    title: 'SSE 解析',
    input: '可能只有半行的文本',
    output: '{"choices":[{"index":0,"delta":{"content":"你好"}}]}',
    note: '先按行读取字段，再用空行派发事件；一次读取可以没有事件，也可以有多条事件。',
  },
  {
    title: '提取正文',
    input: '完整事件中的 JSON',
    output: '你好',
    note: '教学端点使用 Chat Completions 格式：读取 index 为 0 的 choice.delta.content。事件也可能只有角色、用量或结束信息。',
  },
  {
    title: '更新界面',
    input: '已收到的正文增量',
    output: '已收到：你好 / 已显示：你好',
    note: '可以合并多个增量再更新状态；状态更新、React commit、浏览器绘制是不同阶段。',
  },
]

export function Pipeline() {
  const [index, setIndex] = useState(0)
  const stage = stages[index]
  const observerLink = (
    <LabLink path="/playground?demo=network-inspector&source=mine">
      观察一次真实 HTTP 的读取记录 →
    </LabLink>
  )
  if (import.meta.env.SSG_MD) {
    return (
      <section>
        <h2>文字从网络到屏幕的旅程</h2>
        <p>概念示意 · 展示各层的数据形态，不是本次请求的测量记录。</p>
        {stages.map((item, position) => (
          <section key={item.title}>
            <h3>
              {position + 1}. {item.title}
            </h3>
            <p>输入：{item.input}</p>
            <p>输出：</p>
            <pre>
              <code>{item.output}</code>
            </pre>
            <p>{item.note}</p>
          </section>
        ))}
        {observerLink}
      </section>
    )
  }
  return (
    <section className="course-pipeline" aria-label="文字从网络到屏幕的旅程">
      <p>概念示意 · 展示各层的数据形态，不是本次请求的测量记录。</p>
      <nav aria-label="查看数据层级">
        {stages.map((item, position) => (
          <button
            type="button"
            key={item.title}
            aria-pressed={position === index}
            onClick={() => setIndex(position)}
          >
            {position + 1}. {item.title}
          </button>
        ))}
      </nav>
      <div aria-live="polite">
        <p>输入：{stage.input}</p>
        <pre>{stage.output}</pre>
        <p>{stage.note}</p>
      </div>
      {observerLink}
    </section>
  )
}
