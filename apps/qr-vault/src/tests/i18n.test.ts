// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  detectInitialLocale,
  normalizeLocale,
  saveLocale,
} from '@/i18n/language'
import en from '@/i18n/locales/en.json'
import zhCN from '@/i18n/locales/zh-CN.json'

function flattenKeys(value: unknown, prefix = ''): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [prefix]
  return Object.entries(value).flatMap(([key, child]) =>
    flattenKeys(child, prefix ? `${prefix}.${key}` : key),
  )
}

describe('i18n resources', () => {
  it('keeps English and Simplified Chinese keys in sync', () => {
    expect(flattenKeys(zhCN).sort()).toEqual(flattenKeys(en).sort())
  })
})

describe('language detection', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('normalizes supported browser language tags', () => {
    expect(normalizeLocale('zh-TW')).toBe('zh-CN')
    expect(normalizeLocale('zh-Hans-CN')).toBe('zh-CN')
    expect(normalizeLocale('en-US')).toBe('en')
    expect(normalizeLocale('fr-FR')).toBeNull()
  })

  it('uses stored manual language before navigator languages', () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'zh-CN')

    expect(detectInitialLocale({ storage: localStorage, languages: ['en-US'] })).toBe('zh-CN')
  })

  it('detects Chinese navigator languages before falling back to English', () => {
    expect(detectInitialLocale({ storage: localStorage, languages: ['fr-FR', 'zh-HK'] })).toBe(
      'zh-CN',
    )
  })

  it('defaults to English when storage and navigator languages do not match', () => {
    expect(detectInitialLocale({ storage: localStorage, languages: ['fr-FR'] })).toBe(
      DEFAULT_LOCALE,
    )
  })

  it('saves manual language selection to localStorage', () => {
    saveLocale('en', localStorage)

    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('en')
  })
})
