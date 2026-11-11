import { defineStep02Contract } from '../contract'
import {
  MiniChat,
  createVirtualClock,
  replayText,
  sendNonStreamingTurn,
} from './index'

defineStep02Contract({
  MiniChat,
  sendNonStreamingTurn,
  createVirtualClock,
  replayText,
})
