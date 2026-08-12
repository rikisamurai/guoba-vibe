import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { expect, it } from 'vitest'

import { getManagerRoots } from '../core/paths'
import { SkillManager } from '../core/skill-manager'
import { createTestWorkspace } from '../core/test-helpers'
import { ServiceController } from '../service/controller'
import { startWebServer } from './web-server'

it('requires a same-origin JSON request with the local session cookie', async () => {
  const fixture = await createTestWorkspace()
  const staticRoot = join(fixture.root, 'web')
  await mkdir(staticRoot)
  await writeFile(join(staticRoot, 'index.html'), '<!doctype html><title>Guoba</title>')
  const manager = new SkillManager(getManagerRoots(fixture.project, fixture.home))
  const server = await startWebServer(new ServiceController(manager), { port: 0, staticRoot })
  try {
    const landing = await fetch(server.url)
    const cookie = landing.headers.get('set-cookie')?.split(';', 1)[0]
    expect(cookie).toMatch(/^guoba_skills_session=/u)
    const trusted = await invoke(server.url, cookie, server.url, 'application/json')
    expect(trusted.status).toBe(200)
    const crossSite = await invoke(
      server.url,
      cookie,
      'https://attacker.example',
      'application/json',
    )
    expect(crossSite.status).toBe(400)
    const simpleRequest = await invoke(server.url, cookie, server.url, 'text/plain')
    expect(simpleRequest.status).toBe(400)
  } finally {
    await server.close()
    await fixture.cleanup()
  }
})

function invoke(
  baseUrl: string,
  cookie: string | undefined,
  origin: string,
  contentType: string,
): Promise<Response> {
  return fetch(`${baseUrl}/api/invoke`, {
    method: 'POST',
    headers: { Cookie: cookie ?? '', Origin: origin, 'Content-Type': contentType },
    body: JSON.stringify({ action: 'inventory' }),
  })
}
