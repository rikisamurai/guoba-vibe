import { describe, expect, it } from 'vitest'

import config from '../vercel.json'
const appRoutes = config.rewrites.filter((route) => route.destination === '/index.html')
const servesApp = (pathname: string) =>
  appRoutes.some(({ source }) => new URLPattern({ pathname: source }).test({ pathname }))

describe('Vercel Lab routing', () => {
  it.each([
    '/playground',
    '/project',
    '/lab',
    '/profiler',
    '/repro/broken-fence',
    '/chat',
    '/bench',
    '/embed/quick-start',
  ])('serves a direct request to %s from the SPA', (route) => expect(servesApp(route)).toBe(true))

  it('leaves API and static asset requests outside SPA fallback', () => {
    expect(servesApp('/api/chat')).toBe(false)
    expect(servesApp('/assets/main.js')).toBe(false)
  })
})
