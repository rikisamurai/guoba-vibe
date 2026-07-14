import type { InstallRequest, Inventory, SkillRecord, UpdatePreview } from '../shared/types'
import { ensureClaudeLink, makeClaudeSkillCanonical } from './claude-links'
import { getScopePaths, type ManagerRoots } from './paths'
import { scanInventory } from './scanner'
import { installSkill } from './skill-installer'
import { UpdateCoordinator } from './update-coordinator'

export class SkillManager {
  readonly #updates: UpdateCoordinator

  constructor(readonly roots: ManagerRoots) {
    this.#updates = new UpdateCoordinator(roots)
  }

  inventory(): Promise<Inventory> {
    return scanInventory(this.roots)
  }

  async check(id?: string): Promise<Inventory> {
    const inventory = await this.inventory()
    const candidates = id
      ? [requireRecord(inventory, id)]
      : inventory.skills.filter((skill) => skill.provenance?.sourceUrl)
    await Promise.all(candidates.map((skill) => this.#updates.check(skill)))
    return this.inventory()
  }

  async prepare(id: string): Promise<UpdatePreview> {
    return this.#updates.prepare(requireRecord(await this.inventory(), id))
  }

  async apply(previewId: string): Promise<Inventory> {
    await this.#updates.apply(previewId)
    return this.inventory()
  }

  async sync(id?: string): Promise<Inventory> {
    const inventory = await this.inventory()
    const candidates = id
      ? [requireRecord(inventory, id)]
      : inventory.skills.filter((skill) => skill.location === 'canonical')
    await Promise.all(
      candidates.map((skill) => {
        if (skill.location !== 'canonical')
          throw new Error('Make this Claude-only Skill canonical first.')
        return ensureClaudeLink(getScopePaths(this.roots, skill.scope), folderName(skill.id))
      }),
    )
    return this.inventory()
  }

  async makeCanonical(id: string): Promise<Inventory> {
    const skill = requireRecord(await this.inventory(), id)
    if (skill.location !== 'claude_only') throw new Error('This Skill is already canonical.')
    await makeClaudeSkillCanonical(getScopePaths(this.roots, skill.scope), folderName(skill.id))
    return this.inventory()
  }

  async install(request: InstallRequest): Promise<{ id: string; inventory: Inventory }> {
    const id = await installSkill(this.roots, request)
    return { id, inventory: await this.inventory() }
  }
}

function requireRecord(inventory: Inventory, id: string): SkillRecord {
  const skill = inventory.skills.find((candidate) => candidate.id === id)
  if (!skill) throw new Error(`Skill “${id}” was not found.`)
  return skill
}

function folderName(id: string): string {
  return id.slice(id.indexOf(':') + 1)
}
