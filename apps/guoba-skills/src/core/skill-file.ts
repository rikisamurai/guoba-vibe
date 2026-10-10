import { TextDecoder } from 'node:util'

import type { SkillFileContent, SkillRecord } from '../shared/types'
import { buildContentManifest } from './content-manifest'

const decoder = new TextDecoder('utf-8', { fatal: true })

export async function readSkillFile(skill: SkillRecord, path: string): Promise<SkillFileContent> {
  const root = skill.location === 'canonical' ? skill.canonicalPath : skill.claudePath
  const manifest = await buildContentManifest(root)
  const entry = manifest.entries.find((candidate) => candidate.path === path)
  if (!entry) throw new Error(`File “${path}” was not found in ${skill.id}.`)
  if (entry.content.includes(0)) return binaryFile(skill.id, path, entry.content.byteLength)
  try {
    return { skillId: skill.id, path, binary: false, content: decoder.decode(entry.content) }
  } catch {
    return binaryFile(skill.id, path, entry.content.byteLength)
  }
}

function binaryFile(skillId: string, path: string, bytes: number): SkillFileContent {
  return { skillId, path, binary: true, content: `Binary file · ${bytes} bytes` }
}
