import { SkillManager } from '../core/skill-manager'
import type { InstallRequest, ServiceAction } from '../shared/types'

interface IdentifierPayload {
  id?: string
}

export class ServiceController {
  constructor(private readonly manager: SkillManager) {}

  invoke(action: ServiceAction, payload?: unknown): Promise<unknown> {
    switch (action) {
      case 'inventory':
        return this.manager.inventory()
      case 'check':
        return this.manager.check(asIdentifier(payload).id)
      case 'prepare':
        return this.manager.prepare(requiredId(payload))
      case 'apply':
        return this.manager.apply(requiredString(payload, 'previewId'))
      case 'sync':
        return this.manager.sync(asIdentifier(payload).id)
      case 'install':
        return this.manager.install(parseInstallRequest(payload))
      case 'makeCanonical':
        return this.manager.makeCanonical(requiredId(payload))
      case 'chooseProject':
        return Promise.reject(new Error('Project selection is only available in the macOS app.'))
      default:
        return Promise.reject(new Error(`Unknown service action: ${String(action)}`))
    }
  }
}

function asIdentifier(payload: unknown): IdentifierPayload {
  return { id: optionalString(payload, 'id') }
}

function requiredId(payload: unknown): string {
  return requiredString(payload, 'id')
}

function requiredString(payload: unknown, key: string): string {
  const value = isRecord(payload) ? Reflect.get(payload, key) : null
  if (typeof value !== 'string' || !value) throw new Error(`Missing ${key}.`)
  return value
}

function optionalString(payload: unknown, key: string): string | undefined {
  if (!isRecord(payload)) return undefined
  const value = Reflect.get(payload, key)
  return typeof value === 'string' && value ? value : undefined
}

function parseInstallRequest(payload: unknown): InstallRequest {
  const source = requiredString(payload, 'source')
  const scope = requiredString(payload, 'scope')
  if (scope !== 'project' && scope !== 'user') throw new Error('Scope must be project or user.')
  return {
    source,
    scope,
    skill: optionalString(payload, 'skill'),
    ref: optionalString(payload, 'ref'),
  }
}

function isRecord(value: unknown): value is object {
  return typeof value === 'object' && value !== null
}
