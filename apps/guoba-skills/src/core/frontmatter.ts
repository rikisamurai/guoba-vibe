import YAML from 'yaml'

export interface SkillMetadata {
  name: string
  description: string
}

export function parseSkillMetadata(content: string, fallbackName: string): SkillMetadata {
  if (!content.startsWith('---')) return fromHeading(content, fallbackName)
  const end = content.indexOf('\n---', 3)
  if (end === -1) return fromHeading(content, fallbackName)
  try {
    const parsed: unknown = YAML.parse(content.slice(3, end))
    const value = isRecord(parsed) ? parsed : undefined
    return {
      name: stringValue(value?.name) || fallbackName,
      description: stringValue(value?.description) || firstParagraph(content.slice(end + 4)),
    }
  } catch {
    return fromHeading(content, fallbackName)
  }
}

function fromHeading(content: string, fallbackName: string): SkillMetadata {
  const heading = /^#\s+(.+)$/m.exec(content)?.[1]?.trim()
  return {
    name: heading || fallbackName,
    description: firstParagraph(content),
  }
}

function firstParagraph(content: string): string {
  return (
    content
      .replace(/^---[\s\S]*?---/, '')
      .split(/\n\s*\n/)
      .map((part) => part.replace(/^#+\s*/u, '').trim())
      .find(Boolean) ?? 'No description provided.'
  )
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
