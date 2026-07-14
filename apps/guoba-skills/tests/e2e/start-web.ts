import { resolve } from 'node:path'

import { getManagerRoots } from '../../src/core/paths'
import { SkillManager } from '../../src/core/skill-manager'
import { startWebServer } from '../../src/server/web-server'
import { ServiceController } from '../../src/service/controller'
import { createE2eFixture } from './fixture'

const fixture = await createE2eFixture('web-runtime')
const manager = new SkillManager(getManagerRoots(fixture.project, fixture.home))
const server = await startWebServer(new ServiceController(manager), {
  port: 4178,
  staticRoot: resolve('dist/web'),
})

console.log(`E2E Web UI ready at ${server.url}`)

async function close(): Promise<void> {
  await server.close()
  process.exit(0)
}

process.once('SIGINT', () => void close())
process.once('SIGTERM', () => void close())
