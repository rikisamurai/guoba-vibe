import { useState } from 'react'

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
    output: 'data: {"text":"你好"}↵↵',
    note: '保留同一个解码器，跨片段拼出完整字符。',
  },
  {
    title: 'SSE 解析',
    input: '可能只有半行的文本',
    output: '{"text":"你好"}',
    note: '先按行读取字段，再用空行派发事件；一次读取可以没有事件，也可以有多条事件。',
  },
  {
    title: '提取正文',
    input: '完整事件中的 JSON',
    output: '你好',
    note: '此处 text 是教学字段。真实模型需按服务商协议提取，例如 choices[].delta.content。',
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
  return (
    <section className="course-pipeline" aria-label="文字从网络到屏幕的旅程">
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
    </section>
  )
}
