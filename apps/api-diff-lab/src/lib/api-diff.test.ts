import { describe, expect, it } from 'vitest'

import { diffJsonShapes } from './api-diff'

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
})
