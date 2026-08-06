import { textReplayRecords } from '../../src/fixtures/text-replay'
import type { ReplayRecord } from '../../src/replay/replay-source'

export function createQuickStartTrace(): readonly ReplayRecord[] {
  return textReplayRecords({
    id: 'lesson-quick-start',
    stepMs: 0,
    chunks: [
      '# Streaming Render\n\n',
      '同一份 records，',
      '分别交给 **M0** ',
      '与 **M4**。\n\n',
      '| profile | goal |\n',
      '| --- | --- |\n',
      '| M0 | baseline |\n',
      '| M4 | fewer commits |',
    ],
  })
}
