import { expect, it } from 'vitest'

import { defineStep02Contract, type Step02Api } from '../02-replay-clock/contract'
import { M0_FIXTURE } from './fixture'

export interface M0Snapshot {
  raw: string
  visible: string
  parseCount: number
}

export interface M0Renderer {
  push(delta: string): M0Snapshot
  snapshot(): M0Snapshot
}

export interface Step03Api extends Step02Api {
  createM0Renderer(): M0Renderer
}

export function defineStep03Contract(api: Step03Api): void {
  defineStep02Contract(api)

  it('03 keeps raw and visible separate in the M0 parse baseline', () => {
    const renderer = api.createM0Renderer()
    const first = renderer.push(M0_FIXTURE.chunks[0])
    const final = renderer.push(M0_FIXTURE.chunks[1])

    expect({ first, final }).toEqual({
      first: { raw: '**流式', visible: '**流式', parseCount: 1 },
      final: {
        raw: '**流式渲染**',
        visible: '<strong>流式渲染</strong>',
        parseCount: 2,
      },
    })
  })
}
