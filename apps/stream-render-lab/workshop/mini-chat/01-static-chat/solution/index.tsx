import type { NonStreamingTurnInput } from '../contract'

export { MiniChat } from '../mini-chat'

export async function sendNonStreamingTurn({
  complete,
  prompt,
  publish,
}: NonStreamingTurnInput): Promise<void> {
  const userMessage = { role: 'user' as const, text: prompt }
  publish({ phase: 'waiting', messages: [userMessage] })

  const reply = await complete(prompt)

  publish({
    phase: 'completed',
    messages: [userMessage, { role: 'assistant', text: reply }],
  })
}
