import type { ChatMessage, StaticChat } from '../../01-static-chat/contract'
import type { STATIC_CHAT_FIXTURE } from '../../01-static-chat/fixture'
import type { ReplayInput, VirtualClock } from '../contract'

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

export function createVirtualClock(): VirtualClock {
  let currentTime = 0
  const tasks: Array<{ due: number; run: () => void }> = []

  return {
    now: () => currentTime,
    after(ms, task) {
      tasks.push({ due: currentTime + ms, run: task })
    },
    advanceBy(ms) {
      const target = currentTime + ms
      while (true) {
        tasks.sort((left, right) => left.due - right.due)
        const next = tasks[0]
        if (!next || next.due > target) break
        tasks.shift()
        currentTime = next.due
        next.run()
      }
      currentTime = target
    },
  }
}

export function replayText(input: ReplayInput): Promise<void> {
  if (input.chunks.length === 0) return Promise.resolve()

  return new Promise((resolve) => {
    input.chunks.forEach((chunk, index) => {
      input.clock.after(input.intervalMs * (index + 1), () => {
        input.onDelta(chunk)
        if (index === input.chunks.length - 1) resolve()
      })
    })
  })
}
