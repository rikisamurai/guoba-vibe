import { describe, expect, it } from 'vitest'

import { buildDiffRows, diffJsonShapes } from './api-diff'

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
})
