import { useState } from 'react'

import { AnswerView } from './answer-view'
import { useMiniChat } from './use-mini-chat'

import '../beginner/beginner.css'
import './project.css'

export default function ProjectPage() {
  const [prompt, setPrompt] = useState('你好，介绍一下流式回答')
  const [mode, setMode] = useState('stream')
  const chat = useMiniChat()
  const course = import.meta.env.VITE_COURSE_ORIGIN ?? 'http://localhost:5173'
  return (
    <div className="beginner-page">
      <span className="beginner-meta">最终项目 / MINI CHAT</span>
      <h1>从第一次读取，到一份完整回答</h1>
      <p>
        真实 HTTP +
        固定教学回答，不调用模型。你的输入只保留在本页，服务端不会根据问题生成答案。刷新后会清空对话。
      </p>
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
            <option value="buffered">缓冲后一次发送</option>
            <option value="truncated">中途断开</option>
            <option value="error">HTTP 503 错误</option>
          </select>
        </label>
        <div className="project-turns">
          {chat.turns.length === 0 ? (
            <p className="beginner-answer">发送一条消息，观察回答怎样出现。</p>
          ) : (
            chat.turns.map((turn) => (
              <article key={turn.id}>
                <h2>你</h2>
                <p>{turn.prompt}</p>
                <h2>教学助手</h2>
                {turn.text ? (
                  <AnswerView
                    text={turn.text}
                    streaming={chat.busy && turn.id === chat.turns.at(-1)?.id}
                  />
                ) : (
                  <p>等待文字…</p>
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
      <p>
        <a href={`${course}/learn/18-capstone`}>跟着步骤从零组装这个项目 →</a>
      </p>
      <p>
        <a href="/chat">进阶：使用完整渲染管线连接真实模型</a>（需要在服务端配置 Key）
      </p>
    </div>
  )
}
