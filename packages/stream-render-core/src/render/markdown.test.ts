import { describe, expect, it } from 'vitest'

import { md } from './markdown'

describe('markdown 安全基线', () => {
  it('原样 HTML 被转义而非执行', () => {
    const html = md.render('<img src=x onerror=alert(1)>')
    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;img')
  })

  it('javascript: 协议链接不产生可点击的 <a>（降级为纯文本）', () => {
    const html = md.render('[x](javascript:alert(1))')
    expect(html).not.toContain('<a')
    expect(html).not.toContain('href')
  })

  it('data:text 协议链接被拒绝', () => {
    expect(md.render('[x](data:text/html;base64,PHNjcmlwdD4=)')).not.toContain('href')
  })

  it('正常 https 链接保留', () => {
    expect(md.render('[x](https://example.com)')).toContain('href="https://example.com"')
  })
})
