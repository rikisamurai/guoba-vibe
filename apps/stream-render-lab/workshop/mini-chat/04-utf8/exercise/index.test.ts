import { defineStep04Contract } from '../contract'
import {
  MiniChat,
  createM0Renderer,
  createVirtualClock,
  decodeUtf8Chunks,
  replayText,
  sendNonStreamingTurn,
} from './index'

defineStep04Contract({
  MiniChat,
  sendNonStreamingTurn,
  createVirtualClock,
  replayText,
  createM0Renderer,
  decodeUtf8Chunks,
})
