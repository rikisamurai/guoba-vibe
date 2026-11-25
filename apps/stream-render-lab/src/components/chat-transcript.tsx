import { useState } from 'react'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  status?: string
}

interface ChatTranscriptProps {
  messages?: ChatMessage[]
}

const DEMO_MESSAGES: ChatMessage[] = [
  { id: 'u1', role: 'user', text: '为什么 Markdown 在流式过程中会闪烁？' },
  {
    id: 'a1',
    role: 'assistant',
    status: 'M2 · commit #42',
    text: '因为到达的文本可能停在 **未闭合语法** 中。可靠的做法不是修改原文，而是只为当前 dirty tail 构造临时视图；结束后再用原始文本完成 canonical parse。',
  },
]

export function ChatTranscript({ messages = DEMO_MESSAGES }: ChatTranscriptProps) {
  const [draft, setDraft] = useState('')
  return (
    <section className="chat-demo" aria-label="聊天演示">
      <div className="chat-demo__bar">
        <span>
          <i /> DEEPSEEK · DEMO
        </span>
        <span>RAW TEXT PRESERVED</span>
      </div>
      <div className="chat-demo__messages" aria-live="polite">
        {messages.map((message) => (
          <article key={message.id} className={`chat-message chat-message--${message.role}`}>
            <p className="chat-message__role">{message.role === 'user' ? 'YOU' : 'ASSISTANT'}</p>
            {message.status === undefined ? null : (
              <span className="chat-message__status">{message.status}</span>
            )}
            <p>{message.text}</p>
          </article>
        ))}
      </div>
      <form
        className="chat-composer"
        onSubmit={(event) => {
          event.preventDefault()
          setDraft('')
        }}
      >
        <label htmlFor="demo-prompt">输入实验问题</label>
        <input
          id="demo-prompt"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="先用静态数据观察布局…"
        />
        <button type="submit" disabled={draft.trim() === ''}>
          发送
        </button>
      </form>
    </section>
  )
}
