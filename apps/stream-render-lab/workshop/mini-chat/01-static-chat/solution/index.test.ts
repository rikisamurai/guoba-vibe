import { defineStep01Contract } from '../contract'
import { MiniChat, sendNonStreamingTurn } from './index'

defineStep01Contract({ MiniChat, sendNonStreamingTurn })
