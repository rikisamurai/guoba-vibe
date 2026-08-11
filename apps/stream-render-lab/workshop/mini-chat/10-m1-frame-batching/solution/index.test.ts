import { defineStep10Contract } from '../contract'
import { adaptChatCompletions } from './chat-completions'
import { createFrameBatcher } from './frame-batcher'
import {
  MiniChat,
  createM0Renderer,
  createVirtualClock,
  decodeUtf8Chunks,
  replayText,
  sendNonStreamingTurn,
} from './index'
import { parseEventStream } from './sse'

defineStep10Contract({
  MiniChat,
  sendNonStreamingTurn,
  createVirtualClock,
  replayText,
  createM0Renderer,
  decodeUtf8Chunks,
  parseEventStream,
  adaptChatCompletions,
  createFrameBatcher,
})
