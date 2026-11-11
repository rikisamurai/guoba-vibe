import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { ContentVisibilityBlock } from './content-visibility-block'
import { chooseLongOutputMode, planBlockWindow } from './window-plan'

const blocks = Array.from({ length: 1_000 }, (_, index) => ({
  height: 40,
  id: `block-${index}`,
}))

describe('long output experiments', () => {
  it('keeps only the viewport plus overscan while preserving total height', () => {
    const plan = planBlockWindow({
      blocks,
      overscan: 80,
      scrollTop: 20_000,
      viewportHeight: 800,
    })

    expect(plan.ids.length).toBeLessThan(30)
    expect(plan.topSpacer + plan.bottomSpacer + plan.ids.length * 40).toBe(plan.totalHeight)
    expect(plan.totalHeight).toBe(40_000)
  })

  it('expands the window to retain a block with an active selection', () => {
    const plan = planBlockWindow({
      blocks,
      overscan: 0,
      pinnedIds: ['block-2'],
      scrollTop: 20_000,
      viewportHeight: 400,
    })

    expect(plan.ids).toContain('block-2')
    expect(plan.startIndex).toBe(2)
  })

  it('does not window away browser selection or unmeasured content', () => {
    expect(
      chooseLongOutputMode({
        blockCount: 1_000,
        contentVisibilitySupported: true,
        measurementsReady: true,
        selectionActive: true,
      }),
    ).toBe('content-visibility')
    expect(
      chooseLongOutputMode({
        blockCount: 1_000,
        contentVisibilitySupported: false,
        measurementsReady: false,
        selectionActive: false,
      }),
    ).toBe('none')
  })

  it('uses windowing only for measured, very long output', () => {
    expect(
      chooseLongOutputMode({
        blockCount: 799,
        contentVisibilitySupported: true,
        measurementsReady: true,
        selectionActive: false,
      }),
    ).toBe('content-visibility')
    expect(
      chooseLongOutputMode({
        blockCount: 800,
        contentVisibilitySupported: true,
        measurementsReady: true,
        selectionActive: false,
      }),
    ).toBe('windowed')
  })

  it('provides a real content-visibility rendering primitive', () => {
    const html = renderToStaticMarkup(
      <ContentVisibilityBlock estimatedBlockSize={120}>stable block</ContentVisibilityBlock>,
    )

    expect(html).toContain('content-visibility:auto')
    expect(html).toContain('contain-intrinsic-block-size:auto 120px')
  })
})
