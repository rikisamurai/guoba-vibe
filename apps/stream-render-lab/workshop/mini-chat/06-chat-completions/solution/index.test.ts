import { defineStep06Contract } from '../contract'
import { adaptChatCompletions } from './chat-completions'
import {
  MiniChat,
  createM0Renderer,
  createVirtualClock,
  decodeUtf8Chunks,
  replayText,
  sendNonStreamingTurn,
} from './index'
import { parseEventStream } from './sse'

defineStep06Contract({
  MiniChat,
  sendNonStreamingTurn,
  createVirtualClock,
  replayText,
  createM0Renderer,
  decodeUtf8Chunks,
  parseEventStream,
  adaptChatCompletions,
})
