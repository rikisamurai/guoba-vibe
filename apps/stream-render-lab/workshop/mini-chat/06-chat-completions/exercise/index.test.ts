import { defineStep06Contract } from '../contract'
import * as chatCompletions from './chat-completions'
import * as core from './index'
import * as sse from './sse'

defineStep06Contract({ ...core, ...sse, ...chatCompletions })
