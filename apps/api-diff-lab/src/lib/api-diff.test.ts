import { describe, expect, it } from 'vitest'

import { buildDiffReport, buildDiffRows, classifyDiffRows, diffJsonShapes } from './api-diff'
import { parseDiffCases, validateCaseDraft } from './diff-cases'

describe('API shape diff', () => {
  it('reports added, removed, and changed nested fields', () => {
    const diff = diffJsonShapes(
      { user: { id: 7, name: 'Riki' }, tags: ['qr'] },
      { user: { id: '7', handle: 'riki' }, tags: ['qr'] },
    )

    expect(diff).toEqual({
      added: ['user.handle'],
      removed: ['user.name'],
      changed: ['user.id:number->string'],
      unobserved: [],
    })
  })

  it('walks array items instead of treating every array as the same shape', () => {
    const rows = buildDiffRows(
      { items: [{ id: 1, price: 9.9 }] },
      { items: [{ id: '1', name: 'Tea' }] },
    )

    expect(rows).toEqual([
      { kind: 'changed', path: 'items[].id', beforeType: 'number', afterType: 'string' },
      { kind: 'added', path: 'items[].name', afterType: 'string' },
      { kind: 'removed', path: 'items[].price', beforeType: 'number' },
    ])
  })

  it('merges heterogeneous array item types into an inspectable union', () => {
    expect(buildDiffRows({ values: [1, 'one'] }, { values: [1, true] })).toEqual([
      {
        kind: 'changed',
        path: 'values[]',
        beforeType: 'number | string',
        afterType: 'boolean | number',
      },
    ])
  })

  it('detects root primitives, root arrays, and fields added to empty objects', () => {
    expect(buildDiffRows(1, '1')).toEqual([
      { kind: 'changed', path: '$', beforeType: 'number', afterType: 'string' },
    ])
    expect(buildDiffRows([], [1])).toEqual([
      { kind: 'unobserved', path: '$[]', missingSide: 'before', observedType: 'number' },
    ])
    expect(buildDiffRows({ config: {} }, { config: { enabled: true } })).toEqual([
      { kind: 'added', path: 'config.enabled', afterType: 'boolean' },
    ])
  })

  it('marks empty-array item contracts unobserved instead of inventing breaking removals', () => {
    const rows = buildDiffRows({ items: [{ id: 1, name: 'Tea' }] }, { items: [] })

    expect(rows).toEqual([
      { kind: 'unobserved', path: 'items[]', missingSide: 'after', observedType: 'object' },
    ])
    expect(classifyDiffRows(rows)).toEqual({ breaking: [], review: rows })
  })

  it('uses every observed nested-array sample before marking an item path unobserved', () => {
    const before = { groups: [{ items: [] }, { items: [{ id: 1 }] }] }
    const after = { groups: [{ items: [{ name: 'Tea' }] }, { items: [] }] }

    expect(buildDiffRows(before, after)).toEqual([
      { kind: 'removed', path: 'groups[].items[].id', beforeType: 'number' },
      { kind: 'added', path: 'groups[].items[].name', afterType: 'string' },
    ])
  })

  it('keeps unobserved rows when a repeated array is also nullable', () => {
    const empty = { groups: [{ items: [] }, { items: null }] }
    const observed = { groups: [{ items: [{ id: 1 }] }, { items: null }] }

    expect(buildDiffRows(empty, observed)).toEqual([
      {
        kind: 'unobserved',
        path: 'groups[].items[]',
        missingSide: 'before',
        observedType: 'object',
      },
    ])
    expect(buildDiffRows(observed, empty)).toEqual([
      {
        kind: 'unobserved',
        path: 'groups[].items[]',
        missingSide: 'after',
        observedType: 'object',
      },
    ])
  })

  it('escapes dotted and numeric object keys so they cannot collide with nested paths', () => {
    expect(buildDiffRows({ 'user.id': 1, 0: true }, { user: { id: 1 }, 0: 'zero' })).toEqual([
      { kind: 'changed', path: '$["0"]', beforeType: 'boolean', afterType: 'string' },
      { kind: 'removed', path: '$["user.id"]', beforeType: 'number' },
      { kind: 'added', path: 'user', afterType: 'object' },
      { kind: 'added', path: 'user.id', afterType: 'number' },
    ])
  })

  it('does not confuse a root dollar key with the root path marker', () => {
    expect(buildDiffRows({ $: 1 }, { $: '1' })).toEqual([
      { kind: 'changed', path: '$["$"]', beforeType: 'number', afterType: 'string' },
    ])
  })

  it('separates certain breaks from additions that need decoder review', () => {
    const rows = buildDiffRows(
      { user: { id: 7, name: 'Riki' } },
      { user: { id: '7', role: 'dev' } },
    )

    expect(classifyDiffRows(rows)).toEqual({
      breaking: [
        { kind: 'changed', path: 'user.id', beforeType: 'number', afterType: 'string' },
        { kind: 'removed', path: 'user.name', beforeType: 'string' },
      ],
      review: [{ kind: 'added', path: 'user.role', afterType: 'string' }],
    })
  })

  it('exports a contract review report without calling additions universally safe', () => {
    const rows = buildDiffRows({ user: { id: 7 } }, { user: { id: '7', handle: 'riki' } })
    const report = buildDiffReport('Profile contract', rows)

    expect(report).toContain('## Profile contract')
    expect(report).toContain('- breaking: user.id number -> string')
    expect(report).toContain('- review: user.handle missing -> string')
  })
})

describe('case library payloads', () => {
  const validCase = { id: 'profile', label: 'Profile', before: '{}', after: '{}' }

  it('accepts a non-empty, uniquely identified case list', () => {
    expect(parseDiffCases(JSON.stringify([validCase]))).toEqual([validCase])
    expect(
      parseDiffCases(JSON.stringify([{ ...validCase, id: ' profile ', label: ' Profile ' }])),
    ).toEqual([validCase])
  })

  it('rejects empty, duplicate, malformed, and invalid-editor payloads', () => {
    expect(parseDiffCases('[]')).toBeNull()
    expect(parseDiffCases(JSON.stringify([validCase, validCase]))).toBeNull()
    expect(
      parseDiffCases(JSON.stringify([validCase, { ...validCase, id: ' profile ' }])),
    ).toBeNull()
    expect(parseDiffCases('{"bad":true}')).toBeNull()
    expect(parseDiffCases(JSON.stringify([{ ...validCase, before: '{' }]))).toBeNull()
    expect(
      parseDiffCases(
        JSON.stringify(Array.from({ length: 51 }, (_, id) => ({ ...validCase, id: `${id}` }))),
      ),
    ).toBeNull()
  })

  it('validates the case label and both JSON editors before saving', () => {
    expect(validateCaseDraft('', '{}', '{}')).toBe('Case name is required.')
    expect(validateCaseDraft('Case', '{', '{}')).toBe('Before must contain valid JSON.')
    expect(validateCaseDraft('Case', '{}', '{')).toBe('After must contain valid JSON.')
    expect(validateCaseDraft('Case', '{}', '{}')).toBe('')
  })
})
