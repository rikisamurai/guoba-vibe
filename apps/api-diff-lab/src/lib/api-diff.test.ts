import { describe, expect, it } from 'vitest'

import {
  buildDiffReport,
  buildDiffRows,
  classifyDiffRows,
  diffJsonShapes,
  parseDiffCases,
} from './api-diff'

describe('diffJsonShapes', () => {
  it('reports added, removed, and changed nested fields', () => {
    const diff = diffJsonShapes(
      { user: { id: 7, name: 'Riki' }, tags: ['qr'] },
      { user: { id: '7', handle: 'riki' }, tags: ['qr'] },
    )

    expect(diff).toEqual({
      added: ['user.handle'],
      removed: ['user.name'],
      changed: ['user.id:number->string'],
    })
  })

  it('builds inspectable diff rows with before and after type details', () => {
    const rows = buildDiffRows({ user: { id: 7 } }, { user: { id: '7', handle: 'riki' } })

    expect(rows).toEqual([
      { kind: 'added', path: 'user.handle', afterType: 'string' },
      { kind: 'changed', path: 'user.id', beforeType: 'number', afterType: 'string' },
    ])
  })

  it('classifies removed and changed fields as breaking contract drift', () => {
    const rows = buildDiffRows({ user: { id: 7, name: 'Riki' } }, { user: { id: '7' } })

    expect(classifyDiffRows(rows)).toEqual({
      breaking: [
        { kind: 'changed', path: 'user.id', beforeType: 'number', afterType: 'string' },
        { kind: 'removed', path: 'user.name', beforeType: 'string' },
      ],
      nonBreaking: [],
    })
  })

  it('exports a contract review report', () => {
    const rows = buildDiffRows({ user: { id: 7 } }, { user: { id: '7', handle: 'riki' } })

    expect(buildDiffReport('Profile contract', rows)).toContain('## Profile contract')
    expect(buildDiffReport('Profile contract', rows)).toContain(
      '- breaking: user.id number -> string',
    )
    expect(buildDiffReport('Profile contract', rows)).toContain(
      '- non-breaking: user.handle missing -> string',
    )
  })

  it('parses persisted diff cases and rejects malformed payloads', () => {
    const payload = JSON.stringify([{ id: 'profile', label: 'Profile', before: '{}', after: '{}' }])

    expect(parseDiffCases(payload)).toEqual([
      { id: 'profile', label: 'Profile', before: '{}', after: '{}' },
    ])
    expect(parseDiffCases('{"bad":true}')).toBeNull()
  })
})
