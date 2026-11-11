import type { ChatMessage, ChatSnapshot } from './contract'

export function MiniChat({ chat }: { chat: ChatSnapshot }) {
  return (
    <section aria-label="Mini Chat">
      {chat.messages.map((message) => (
        <Message key={message.role} message={message} />
      ))}
      {chat.phase === 'waiting' ? <p role="status">正在等待完整回复…</p> : null}
    </section>
  )
}

function Message({ message }: { message: ChatMessage }) {
  return (
    <article data-role={message.role}>
      <strong>{message.role === 'user' ? 'You' : 'Assistant'}</strong>
      <p>{message.text}</p>
    </article>
  )
}
