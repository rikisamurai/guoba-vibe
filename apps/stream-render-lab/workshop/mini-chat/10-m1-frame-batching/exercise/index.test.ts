import { defineStep10Contract } from '../contract'
import * as chatCompletions from './chat-completions'
import * as frameBatcher from './frame-batcher'
import * as core from './index'
import * as sse from './sse'

defineStep10Contract({ ...core, ...sse, ...chatCompletions, ...frameBatcher })
