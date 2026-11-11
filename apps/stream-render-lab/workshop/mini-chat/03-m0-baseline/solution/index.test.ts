import { defineStep03Contract } from '../contract'
import {
  MiniChat,
  createM0Renderer,
  createVirtualClock,
  replayText,
  sendNonStreamingTurn,
} from './index'

defineStep03Contract({
  MiniChat,
  sendNonStreamingTurn,
  createVirtualClock,
  replayText,
  createM0Renderer,
})
