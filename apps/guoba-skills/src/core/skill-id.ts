export function folderFromSkillId(id: string): string {
  const match = /^(?:project|user):([\w.-]+)$/u.exec(id)
  if (!match || match[1].startsWith('.')) throw new Error(`Invalid Skill ID “${id}”.`)
  return match[1]
}
