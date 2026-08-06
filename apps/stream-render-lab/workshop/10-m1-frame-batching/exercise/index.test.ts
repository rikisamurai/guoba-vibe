import { it } from 'vitest'

import { assertFrameBatcherContract, assertMiniChatEvolution } from '../contract'
import { createFrameBatcher } from './frame-batcher'

it('commits at most once per frame and drains safely', () =>
  assertFrameBatcherContract(createFrameBatcher))

it('reuses the SSE lesson to render one evolving mini chat', () =>
  assertMiniChatEvolution(createFrameBatcher))
