import { describe, expect, it } from 'vitest'

import {
  buildEnvironmentLinks,
  removeQueryParam,
  upsertQueryParam,
  validateDeepLink,
} from './deep-link-lab'
import {
  addProfile,
  removeProfile,
  saveProfileParam,
  updateProfileIdentity,
} from './profile-operations'
import { exportWorkspace, importWorkspace, workspaceSchema } from './workspace'

const workspace = {
  schema: workspaceSchema,
  name: 'Shopping release links',
  target: 'xhsdiscover://item/detail?id=42',
  profiles: [{ id: 'prod', name: 'Production', params: { env: 'prod' } }],
}

describe('deep-link compiler', () => {
  it('keeps a custom scheme while applying each profile', () => {
    const links = buildEnvironmentLinks(workspace.target, [
      { id: 'staging', name: 'Staging', params: { env: 'staging', source: 'lab' } },
    ])

    expect(links).toEqual([
      {
        id: 'staging',
        name: 'Staging',
        url: 'xhsdiscover://item/detail?id=42&env=staging&source=lab',
        queryCount: 3,
        scheme: 'xhsdiscover',
      },
    ])
  })

  it('never throws when query operations receive an invalid target', () => {
    expect(upsertQueryParam('not a url', 'source', 'lab')).toBe('not a url')
    expect(removeQueryParam('not a url', 'source')).toBe('not a url')
  })

  it('allows web and well-formed app schemes', () => {
    expect(validateDeepLink('https://example.com/path').ok).toBe(true)
    expect(validateDeepLink('my-app://checkout/confirm').ok).toBe(true)
  })

  it.each([
    'javascript:alert(1)',
    'data:text/html,hello',
    'file://host/private.txt',
    'blob:https://example.com/id',
    'custom:path-without-target',
    'https://user:secret@example.com',
  ])('blocks unsafe or non-dispatchable target %s', (target) => {
    expect(validateDeepLink(target).ok).toBe(false)
    expect(buildEnvironmentLinks(target, workspace.profiles)).toEqual([])
  })
})

describe('workspace schema', () => {
  it('round-trips a versioned workspace', () => {
    expect(importWorkspace(exportWorkspace(workspace))).toEqual({ ok: true, workspace })
  })

  it.each([
    ['invalid JSON', '{'],
    ['non-object root', '[]'],
    ['missing schema', JSON.stringify({ ...workspace, schema: undefined })],
    ['wrong schema', JSON.stringify({ ...workspace, schema: 'v2' })],
    ['extra field', JSON.stringify({ ...workspace, extra: true })],
    ['unsafe target', JSON.stringify({ ...workspace, target: 'javascript:alert(1)' })],
    ['empty profiles', JSON.stringify({ ...workspace, profiles: [] })],
  ])('rejects %s with an actionable error', (_case, payload) => {
    const result = importWorkspace(payload)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message.length).toBeGreaterThan(8)
  })

  it.each([
    ['string params', { id: 'qa', name: 'QA', params: 'oops' }],
    ['array params', { id: 'qa', name: 'QA', params: ['oops'] }],
    ['non-string param', { id: 'qa', name: 'QA', params: { env: 2 } }],
    ['invalid id', { id: 'QA team', name: 'QA', params: {} }],
    ['empty name', { id: 'qa', name: ' ', params: {} }],
    ['extra field', { id: 'qa', name: 'QA', params: {}, target: 'other' }],
    ['reserved key', { id: 'qa', name: 'QA', params: { constructor: 'x' } }],
  ])('rejects profile with %s', (_case, profile) => {
    const result = importWorkspace(JSON.stringify({ ...workspace, profiles: [profile] }))
    expect(result.ok).toBe(false)
  })

  it('rejects duplicate profile ids and names', () => {
    const duplicateId = { id: 'prod', name: 'Preview', params: {} }
    const duplicateName = { id: 'preview', name: 'production', params: {} }
    expect(
      importWorkspace(
        JSON.stringify({ ...workspace, profiles: [...workspace.profiles, duplicateId] }),
      ).ok,
    ).toBe(false)
    expect(
      importWorkspace(
        JSON.stringify({ ...workspace, profiles: [...workspace.profiles, duplicateName] }),
      ).ok,
    ).toBe(false)
  })
})

describe('profile operations', () => {
  it('adds and removes profiles without allowing an empty matrix', () => {
    const added = addProfile(workspace.profiles)
    expect(added.ok && added.profiles).toHaveLength(2)
    expect(removeProfile(workspace.profiles, 'prod').ok).toBe(false)
  })

  it('rejects duplicate identity and parameter keys', () => {
    const profiles = [...workspace.profiles, { id: 'qa', name: 'QA', params: { env: 'qa' } }]
    expect(updateProfileIdentity(profiles, 'qa', 'prod', 'QA').ok).toBe(false)
    expect(updateProfileIdentity(profiles, 'qa', 'qa', 'production').ok).toBe(false)
    expect(saveProfileParam(profiles, 'qa', null, 'env', 'other').ok).toBe(false)
    expect(saveProfileParam(profiles, 'qa', null, '', 'other').ok).toBe(false)
  })

  it('renames and removes profile parameters immutably', () => {
    const renamed = saveProfileParam(workspace.profiles, 'prod', 'env', 'environment', 'prod')
    expect(renamed.ok && renamed.profiles[0].params).toEqual({ environment: 'prod' })
    expect(workspace.profiles[0].params).toEqual({ env: 'prod' })
  })
})
