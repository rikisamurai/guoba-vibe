import { describe, expect, it, vi } from 'vitest'

import { copyLink, openLink } from './browser-actions'
import {
  appendQueryParam,
  buildEnvironmentLinks,
  readDeepLinkParts,
  readOpenPolicy,
  removeQueryParamAt,
  updateQueryParamAt,
  validateDeepLink,
} from './deep-link-lab'
import {
  addProfile,
  removeProfile,
  saveProfileParam,
  updateProfileIdentity,
} from './profile-operations'
import { exportWorkspace, importWorkspace, validateWorkspace, workspaceSchema } from './workspace'

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
    expect(appendQueryParam('not a url', 'source', 'lab')).toBe('not a url')
    expect(updateQueryParamAt('not a url', 0, 'lab')).toBe('not a url')
    expect(removeQueryParamAt('not a url', 0)).toBe('not a url')
  })

  it('allows web and well-formed app schemes', () => {
    expect(validateDeepLink('https://example.com/path').ok).toBe(true)
    expect(validateDeepLink('my-app://checkout/confirm').ok).toBe(true)
  })

  it.each([
    'chrome-extension://abcdefghijklmnop/options.html',
    'devtools://devtools/bundled/inspector.html',
    'file://host/private.txt',
    'view-source://example.com/path',
  ])('compiles but blocks browser dispatch for %s', (target) => {
    const validation = validateDeepLink(target)
    expect(validation.ok).toBe(true)
    expect(readOpenPolicy(validation).allowed).toBe(false)
    expect(openLink(target).ok).toBe(false)
  })

  it('only dispatches web and trusted workspace app schemes', () => {
    expect(readOpenPolicy(validateDeepLink('https://example.com')).allowed).toBe(true)
    expect(readOpenPolicy(validateDeepLink('xhsdiscover://item/detail')).allowed).toBe(true)
    expect(readOpenPolicy(validateDeepLink('my-app://checkout/confirm')).allowed).toBe(false)
  })

  it.each([
    'javascript:alert(1)',
    'data:text/html,hello',
    'blob:https://example.com/id',
    'custom:path-without-target',
    'https://user:secret@example.com',
  ])('blocks unsafe or non-dispatchable target %s', (target) => {
    expect(validateDeepLink(target).ok).toBe(false)
    expect(buildEnvironmentLinks(target, workspace.profiles)).toEqual([])
  })

  it('preserves repeated query order while editing one occurrence', () => {
    const target = 'xhsdiscover://item/detail?tag=a&tag=b&sort=recent'

    expect(readDeepLinkParts(target)?.query).toEqual([
      { index: 0, key: 'tag', value: 'a' },
      { index: 1, key: 'tag', value: 'b' },
      { index: 2, key: 'sort', value: 'recent' },
    ])
    expect(updateQueryParamAt(target, 1, 'x')).toBe(
      'xhsdiscover://item/detail?tag=a&tag=x&sort=recent',
    )
    expect(removeQueryParamAt(target, 0)).toBe('xhsdiscover://item/detail?tag=b&sort=recent')
    expect(appendQueryParam(target, 'tag', 'c')).toBe(
      'xhsdiscover://item/detail?tag=a&tag=b&sort=recent&tag=c',
    )
  })
})

describe('workspace schema', () => {
  it('round-trips a versioned workspace', () => {
    expect(importWorkspace(exportWorkspace(workspace))).toEqual({ ok: true, workspace })
  })

  it('blocks export preparation for a workspace its importer would reject', () => {
    expect(validateWorkspace({ ...workspace, target: 'not a url' })).toEqual({
      ok: false,
      message: 'Workspace target: Enter a valid URL or app deep link.',
    })
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

  it('creates a profile identity that stays valid against existing display names', () => {
    const result = addProfile([{ id: 'prod', name: 'Profile 2', params: {} }])

    expect(result.ok && result.profiles[1]).toEqual({
      id: 'profile-3',
      name: 'Profile 3',
      params: {},
    })
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

describe('browser actions', () => {
  it('restores keyboard focus after the clipboard fallback', async () => {
    class FakeHTMLElement {
      focus = vi.fn()
      isConnected = true
    }
    const previousFocus = new FakeHTMLElement()
    const textarea = {
      value: '',
      style: {} as Record<string, string>,
      select: vi.fn(),
      remove: vi.fn(),
      setAttribute: vi.fn(),
    }
    vi.stubGlobal('navigator', { clipboard: undefined })
    vi.stubGlobal('HTMLElement', FakeHTMLElement)
    vi.stubGlobal('document', {
      activeElement: previousFocus,
      body: { append: vi.fn() },
      createElement: vi.fn(() => textarea),
      execCommand: vi.fn(() => true),
    })

    try {
      await expect(copyLink('https://example.com')).resolves.toMatchObject({ ok: true })
      expect(previousFocus.focus).toHaveBeenCalledWith({ preventScroll: true })
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
