import type { ParsedPostUrl } from './media'

const SUPPORTED_HOSTS = new Set([
  'x.com',
  'www.x.com',
  'twitter.com',
  'www.twitter.com',
  'mobile.twitter.com',
])

const STATUS_ID_PATTERN = /^\d{5,30}$/
const USERNAME_PATTERN = /^[A-Za-z0-9_]{1,20}$/

export function parsePostUrl(input: string): ParsedPostUrl {
  const trimmed = input.trim()
  if (!trimmed) throw new Error('请输入推文链接')

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    throw new Error('链接格式无效')
  }

  const hostname = url.hostname.toLowerCase()
  if (!SUPPORTED_HOSTS.has(hostname)) {
    throw new Error('仅支持 x.com / twitter.com 推文详情页链接')
  }

  const segments = url.pathname.split('/').filter(Boolean)
  const statusIndex = segments.indexOf('status')
  const username = statusIndex > 0 ? segments[statusIndex - 1] : ''
  const statusId = statusIndex >= 0 ? segments[statusIndex + 1] : ''

  if (!USERNAME_PATTERN.test(username) || !STATUS_ID_PATTERN.test(statusId ?? '')) {
    throw new Error('请粘贴标准推文详情页链接')
  }

  return {
    inputUrl: trimmed,
    normalizedUrl: `https://x.com/${username}/status/${statusId}`,
    statusId,
    username,
  }
}

export function isAllowedMediaUrl(input: string): boolean {
  try {
    const url = new URL(input)
    return (
      url.protocol === 'https:' &&
      url.hostname.endsWith('.twimg.com') &&
      url.pathname.toLowerCase().includes('.mp4')
    )
  } catch {
    return false
  }
}
