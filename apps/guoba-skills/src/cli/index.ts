#!/usr/bin/env node
import { access } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { Command } from 'commander'
import { render } from 'ink'
import open from 'open'
import React from 'react'

import { getManagerRoots, findProjectRoot } from '../core/paths'
import { SkillManager } from '../core/skill-manager'
import { startWebServer } from '../server/web-server'
import { ServiceController } from '../service/controller'
import type { SkillScope } from '../shared/types'
import { printInventory, printPreview } from './output'
import { Tui } from './tui'

const program = new Command()
  .name('guoba-skills')
  .description('Manage Project and User Skills for Codex and Claude')
  .version('0.1.0')

program
  .command('list')
  .option('--json', 'print machine-readable JSON')
  .action(async (options) => {
    const inventory = await (await manager()).inventory()
    if (options.json) console.log(JSON.stringify(inventory, null, 2))
    else printInventory(inventory)
  })

program
  .command('check')
  .argument('[id]')
  .action(async (id?: string) => {
    printInventory(await (await manager()).check(id))
  })

program
  .command('update')
  .argument('<id>')
  .option('--yes', 'apply the exact revision after printing its diff')
  .action(async (id: string, options) => {
    const instance = await manager()
    const preview = await instance.prepare(id)
    printPreview(preview)
    if (!options.yes) {
      console.log('\nPreview only. Re-run with --yes to apply this update.')
      return
    }
    printInventory(await instance.apply(preview.previewId))
  })

program
  .command('sync')
  .argument('[id]')
  .action(async (id?: string) => {
    printInventory(await (await manager()).sync(id))
  })

program
  .command('install')
  .argument('<source>')
  .option('--scope <scope>', 'project or user', 'project')
  .option('--skill <slug>', 'Skill folder/name in a multi-Skill repository')
  .option('--ref <ref>', 'branch, tag, or ref to track')
  .action(async (source: string, options) => {
    const scope = parseScope(options.scope)
    const result = await (
      await manager()
    ).install({ source, scope, skill: options.skill, ref: options.ref })
    console.log(`Installed ${result.id}; .agents is canonical and .claude is linked.`)
  })

program
  .command('ui')
  .option('--port <port>', 'local port', '4178')
  .option('--no-open', 'do not open the browser')
  .action(async (options) => {
    const instance = await manager()
    const server = await startWebServer(new ServiceController(instance), {
      port: Number(options.port),
      staticRoot: await webRoot(),
    })
    console.log(`Guoba Skills Web UI: ${server.url}`)
    if (options.open) await open(server.url)
    const close = async () => {
      await server.close()
      process.exit(0)
    }
    process.once('SIGINT', () => void close())
    process.once('SIGTERM', () => void close())
  })

async function manager(): Promise<SkillManager> {
  const projectRoot = await findProjectRoot()
  return new SkillManager(getManagerRoots(projectRoot))
}

async function webRoot(): Promise<string> {
  const directory = dirname(fileURLToPath(import.meta.url))
  const candidates = [join(directory, '..', 'web'), join(directory, '..', '..', 'dist', 'web')]
  const available = await Promise.all(
    candidates.map(async (candidate) => {
      try {
        await access(join(candidate, 'index.html'))
        return candidate
      } catch {
        return undefined
      }
    }),
  )
  const root = available.find(Boolean)
  if (root) return root
  throw new Error('Web UI is not built. Run `pnpm build:web` first.')
}

function parseScope(value: string): SkillScope {
  if (value === 'project' || value === 'user') return value
  throw new Error('Scope must be project or user.')
}

async function main(): Promise<void> {
  if (process.argv.length === 2) {
    const instance = await manager()
    await render(React.createElement(Tui, { manager: instance })).waitUntilExit()
    return
  }
  await program.parseAsync()
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
