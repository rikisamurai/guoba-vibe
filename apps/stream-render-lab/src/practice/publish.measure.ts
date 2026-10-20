import { expect, it } from 'vitest'

import { implementations } from './implementations'
import {
  type CreatePublisher,
  FRAME_MS,
  immediatePublisher,
  measurePublish,
  publishScenarios,
} from './publish-measure'

const candidates: [string, CreatePublisher][] = [
  ['基线：每次输入立即发布', immediatePublisher],
  [
    '我的 src/my-chat/publish.ts',
    (show, clock) => implementations.mine.createPublisher(show, clock),
  ],
  [
    '参考 src/reference-chat/publish.ts',
    (show, clock) => implementations.reference.createPublisher(show, clock),
  ],
]
for (const scenario of publishScenarios) {
  it(`publish.ts 测量 · ${scenario.label}`, () => {
    const rows = candidates.map(([name, create]) =>
      Object.assign(measurePublish(create, scenario), { name }),
    )
    console.info(
      [
        `\n${scenario.label}（虚拟帧 ${FRAME_MS.toFixed(1)} ms）`,
        'input  publish  avg wait  max wait  final  实现',
        ...rows.map((row) =>
          [
            String(row.pushes).padStart(5),
            String(row.publishes).padStart(8),
            `${row.averageWaitMs} ms`.padStart(9),
            `${row.maxWaitMs} ms`.padStart(9),
            (row.finalMatches ? 'ok' : 'LOST').padStart(6),
            ` ${row.name}`,
          ].join(' '),
        ),
      ].join('\n'),
    )
    const mine = rows[1]
    expect(mine.finalMatches, '我的 publish.ts 结束后没有交出完整正文').toBe(true)
  })
}
