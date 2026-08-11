import type { NonStreamingTurnInput } from '../contract'

export { MiniChat } from '../mini-chat'

export async function sendNonStreamingTurn({
  complete,
  prompt,
  publish,
}: NonStreamingTurnInput): Promise<void> {
  const userMessage = { role: 'user' as const, text: prompt }
  publish({ phase: 'waiting', messages: [userMessage] })

  await complete(prompt)
  // TODO 01: publish the completed snapshot with the unchanged reply.
}
