import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { myRenderPolicy } from '../my-chat/render-policy'
import { AcceptancePanel } from '../practice/acceptance-panel'
import { AnswerView } from './answer-view'
import { useMiniChat } from './use-mini-chat'

import '../beginner/beginner.css'
import './project.css'

export default function ProjectPage() {
  const [params, setParams] = useSearchParams()
  const source = params.get('source') === 'reference' ? 'reference' : 'mine'
  const [prompt, setPrompt] = useState('你好，介绍一下流式回答')
  const [mode, setMode] = useState('stream')
  const chat = useMiniChat(source)
  const course = import.meta.env.VITE_COURSE_ORIGIN ?? 'http://localhost:5173'
  return (
    <div className="beginner-page">
      <span className="beginner-meta">贯穿课程 / MINI CHAT</span>
      <h1>同一个项目，一步步做到可靠</h1>
      <p>从真实 HTTP 到渲染优化。修改自己的代码，发送消息，再用相同代码运行验收。</p>
      <section className="beginner-demo project-source" aria-label="实现来源">
        <label>
          运行代码{' '}
          <select
            aria-label="运行代码"
            value={source}
            disabled={chat.busy}
            onChange={(event) => setParams({ source: event.target.value })}
          >
            <option value="mine">我的实现</option>
            <option value="reference">参考实现</option>
          </select>
        </label>
        <div>
          <code>src/{source === 'mine' ? 'my-chat' : 'reference-chat'}/</code>
          <p>
            {source === 'mine'
              ? '编辑这组文件，开发服务器会加载你的修改。起点只覆盖普通输入，边界由课程逐步补齐。'
              : '独立参考实现，用于对照结果。切回我的实现继续练习。'}
          </p>
          <small>
            渲染策略：{source === 'mine' ? myRenderPolicy.profile : 'M4'} ·{' '}
            <a href="/profiler">比较策略与实测代价 →</a>
          </small>
        </div>
      </section>
      <section className="beginner-demo" aria-label="教学聊天项目">
        <label>
          服务场景{' '}
          <select
            aria-label="服务场景"
            disabled={chat.busy}
            value={mode}
            onChange={(event) => setMode(event.target.value)}
          >
            <option value="stream">分段发送</option>
            <option value="split">拆开 UTF-8 字节</option>
            <option value="buffered">缓冲后一次发送</option>
            <option value="truncated">中途断开</option>
            <option value="error">HTTP 503 错误</option>
          </select>
        </label>
        <p className="beginner-meta">
          真实 HTTP · 固定教学回答，无需 Key。输入只保留在本页，不发送给模型；刷新清空对话。
        </p>
        <div className="project-turns" aria-label="对话记录">
          {chat.turns.length === 0 ? (
            <p className="beginner-answer">发送一条消息，先确认普通回答能够跑通。</p>
          ) : (
            chat.turns.map((turn) => (
              <article key={turn.id}>
                <h2>你</h2>
                <p>{turn.prompt}</p>
                <h2>教学助手 · {turn.source === 'mine' ? '我的实现' : '参考实现'}</h2>
                {turn.text ? (
                  <AnswerView text={turn.text} snapshot={turn.snapshot} />
                ) : (
                  <p>尚无正文</p>
                )}
                <p role="status">{turn.status}</p>
              </article>
            ))
          )}
        </div>
        <form
          className="beginner-controls"
          onSubmit={(event) => {
            event.preventDefault()
            if (!chat.busy) void chat.send(prompt, mode)
          }}
        >
          <label>
            消息{' '}
            <input
              aria-label="消息"
              value={prompt}
              maxLength={500}
              onChange={(event) => setPrompt(event.target.value)}
            />
          </label>
          <button type="submit" disabled={chat.busy || !prompt.trim()}>
            发送
          </button>
          <button type="button" disabled={!chat.busy} onClick={chat.stop}>
            停止
          </button>
          <button
            type="button"
            disabled={chat.busy || !chat.turns.length}
            onClick={() => {
              const previous = chat.turns.at(-1)
              if (previous) void chat.send(previous.prompt, mode)
            }}
          >
            重试上一条
          </button>
        </form>
        <p className="beginner-note">
          本次读取 {chat.stats.reads} 次 · {chat.stats.bytes} 字节 · 首段正文到达{' '}
          {chat.stats.first ? `${chat.stats.first} ms` : '等待中'}（本机实测，非绘制时间）
        </p>
      </section>
      <AcceptancePanel key={source} source={source} />
      <p>
        <a href={`/playground?demo=network-inspector&source=${source}`}>逐次观察网络数据 →</a> ·{' '}
        <a href={`${course}/learn/18-capstone`}>项目验收步骤 →</a>
      </p>
      <p>
        <a href="/chat">进阶：连接真实模型</a>（需要服务端配置 Key；教学页不发送你的问题）
      </p>
    </div>
  )
}
