import type { ChatMessage } from '../../types/message'
import { Markdown } from './markdown'

function ModeNaive({ text }: { text: string }) {
  return <Markdown text={text} />
}

/**
 * The fork point: every renderer mode receives the same committed text and
 * derives its own view. M1–M3 arrive in later stages and fall back to naive
 * until then.
 */
export function MessageBody({ message }: { message: ChatMessage }) {
  return (
    <div className="text-[14.5px] leading-[1.65]">
      <ModeNaive text={message.text} />
    </div>
  )
}
