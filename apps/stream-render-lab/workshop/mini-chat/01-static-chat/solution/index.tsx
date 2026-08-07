import type { ChatMessage, StaticChat } from '../contract'
import type { STATIC_CHAT_FIXTURE } from '../fixture'

export function createStaticChat(input: typeof STATIC_CHAT_FIXTURE): StaticChat {
  return {
    messages: [
      { role: 'user', text: input.prompt },
      { role: 'assistant', text: input.reply },
    ],
  }
}

export function MiniChat({ chat }: { chat: StaticChat }) {
  return (
    <section aria-label="Mini Chat">
      {chat.messages.map((message) => (
        <Message key={message.role} message={message} />
      ))}
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
