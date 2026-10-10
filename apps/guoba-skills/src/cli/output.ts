import type { Inventory, SkillRecord, UpdatePreview } from '../shared/types'

export function printInventory(inventory: Inventory): void {
  const rows = inventory.skills.map((skill) => [
    skill.id,
    skill.updateStatus,
    skill.linkStatus,
    compact(skill.description, 58),
  ])
  const widths = [
    Math.max(2, ...rows.map((row) => row[0].length)),
    Math.max(6, ...rows.map((row) => row[1].length)),
    Math.max(6, ...rows.map((row) => row[2].length)),
  ]
  console.log(
    [
      'ID'.padEnd(widths[0]),
      'STATUS'.padEnd(widths[1]),
      'CLAUDE'.padEnd(widths[2]),
      'DESCRIPTION',
    ].join('  '),
  )
  for (const row of rows) {
    console.log(
      [row[0].padEnd(widths[0]), row[1].padEnd(widths[1]), row[2].padEnd(widths[2]), row[3]].join(
        '  ',
      ),
    )
  }
  if (rows.length === 0) console.log('No Skills found in .agents/skills or .claude/skills.')
}

export function printPreview(preview: UpdatePreview): void {
  console.log(`\n${preview.skillId}`)
  console.log(`${short(preview.baseContentHash)} → ${short(preview.remoteContentHash)}`)
  if (preview.changes.length === 0)
    console.log('No content changes; provenance can still be refreshed.')
  for (const change of preview.changes) {
    const prefix = { added: '+', removed: '-', modified: '~' }[change.kind]
    console.log(`\n${prefix} ${change.path}`)
    if (change.patch) console.log(change.patch.trimEnd())
  }
}

export function summarizeSkill(skill: SkillRecord): string {
  return `${skill.id}: ${skill.updateStatus}, Claude ${skill.linkStatus}`
}

function compact(value: string, width: number): string {
  const text = value.replace(/\s+/gu, ' ').trim()
  return text.length > width ? `${text.slice(0, width - 1)}…` : text
}

function short(hash: string): string {
  return hash.replace(/^(?:sha256:|git-tree:)/u, '').slice(0, 12)
}
