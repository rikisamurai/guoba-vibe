import { describe, expect, it } from 'vitest'

import {
  buildDefinitionDependencyIndex,
  changedDefinitions,
  planM3bUpdate,
  prefixDefinitionContext,
  targetedReferenceBlocks,
} from './m3b'
import { normalizeRenderIr } from './normalize'
import { parsePreview } from './preview'

describe('M3b definition dependency experiment', () => {
  it('indexes effective definitions and the blocks that reference them', () => {
    const document = parsePreview('[x]\n\n[y]\n\n[x]: /one\n[y]: /two', { mode: 'M2' })
    const index = buildDefinitionDependencyIndex(document)

    expect([...index.definitions]).toEqual([
      ['x', expect.objectContaining({ source: '[x]: /one' })],
      ['y', expect.objectContaining({ source: '[y]: /two' })],
    ])
    expect(index.references.get('x')).toHaveLength(1)
    expect(index.references.get('y')).toHaveLength(1)
  })

  it('injects only stable-prefix definitions required by tail references', () => {
    const raw = '[x]: /one\n\n[y]: /two\n\nstable\n\n[x]'
    const dirtyStart = raw.lastIndexOf('[x]')
    const index = buildDefinitionDependencyIndex(parsePreview(raw, { mode: 'M2' }))

    expect(prefixDefinitionContext(index, dirtyStart)).toBe('[x]: /one')
  })

  it('targets reference blocks when an effective definition changes', () => {
    const before = buildDefinitionDependencyIndex(
      parsePreview('[x]\n\n[y]\n\n[x]: /one\n[y]: /same', { mode: 'M2' }),
    )
    const after = buildDefinitionDependencyIndex(
      parsePreview('[x]\n\n[y]\n\n[x]: /two\n[y]: /same', { mode: 'M2' }),
    )
    const changed = changedDefinitions(before, after)

    expect(changed).toEqual(['x'])
    expect(targetedReferenceBlocks(changed, before, after)).toEqual([
      expect.stringContaining('block-0-'),
    ])
  })

  it('keeps CommonMark first-wins semantics for duplicate definitions', () => {
    const previous = '[x]\n\n[x]: /one'
    const next = `${previous}\n\n[x]: /ignored`
    const plan = planM3bUpdate(previous, next, previous.length + 2)

    expect(plan.changedIdentifiers).toEqual([])
    expect(plan.invalidatedBlockIds).toEqual([])
  })

  it('continues to publish the M2 oracle until candidate equivalence is proven', () => {
    const previous = '[x]\n\nstable'
    const next = `${previous}\n\n[x]: /one`
    const plan = planM3bUpdate(previous, next, previous.length + 2)

    expect(plan.safety).toBe('oracle-fallback')
    expect(plan.changedIdentifiers).toEqual(['x'])
    expect(normalizeRenderIr(plan.accepted)).toEqual(
      normalizeRenderIr(parsePreview(next, { mode: 'M2' })),
    )
  })
})
