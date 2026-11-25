import { parsePreview } from './preview'
import type { RenderBlock, RenderDocument, RenderNode } from './types'

export interface DefinitionRecord {
  blockId: string
  fingerprint: string
  identifier: string
  offset: number
  source: string
}

export interface ReferenceRecord {
  blockId: string
  identifier: string
  offset: number
}

export interface DefinitionDependencyIndex {
  definitions: ReadonlyMap<string, DefinitionRecord>
  references: ReadonlyMap<string, readonly ReferenceRecord[]>
}

export interface M3bPlan {
  accepted: RenderDocument
  changedIdentifiers: readonly string[]
  invalidatedBlockIds: readonly string[]
  prefixContext: string
  safety: 'oracle-fallback'
}

function normalizedIdentifier(identifier?: string): string | undefined {
  return identifier?.trim().toLowerCase().replaceAll(/\s+/g, ' ')
}

function nodeSource(document: RenderDocument, node: RenderNode): string {
  const start = node.position?.start.offset
  const end = node.position?.end.offset
  if (start === undefined || end === undefined) return ''
  return document.raw.slice(start, end)
}

function definitionFingerprint(node: RenderNode, source: string): string {
  if (node.type === 'definition') {
    return JSON.stringify([node.url ?? null, node.title ?? null])
  }
  return source.trim()
}

function visitNode(
  document: RenderDocument,
  block: RenderBlock,
  node: RenderNode,
  definitions: Map<string, DefinitionRecord>,
  references: Map<string, ReferenceRecord[]>,
): void {
  const identifier = normalizedIdentifier(node.identifier)
  const isDefinition = node.type === 'definition' || node.type === 'footnoteDefinition'
  if (identifier && isDefinition && !definitions.has(identifier)) {
    const source = nodeSource(document, node)
    definitions.set(identifier, {
      blockId: block.id,
      fingerprint: definitionFingerprint(node, source),
      identifier,
      offset: node.position?.start.offset ?? block.range.start,
      source,
    })
  } else if (identifier && !isDefinition) {
    const records = references.get(identifier) ?? []
    records.push({
      blockId: block.id,
      identifier,
      offset: node.position?.start.offset ?? block.range.start,
    })
    references.set(identifier, records)
  }
  node.children?.forEach((child) => {
    visitNode(document, block, child, definitions, references)
  })
}

export function buildDefinitionDependencyIndex(
  document: RenderDocument,
): DefinitionDependencyIndex {
  const definitions = new Map<string, DefinitionRecord>()
  const references = new Map<string, ReferenceRecord[]>()
  document.blocks.forEach((block) => {
    visitNode(document, block, block.node, definitions, references)
  })
  return { definitions, references }
}

export function changedDefinitions(
  before: DefinitionDependencyIndex,
  after: DefinitionDependencyIndex,
): string[] {
  const identifiers = new Set([...before.definitions.keys(), ...after.definitions.keys()])
  return [...identifiers]
    .filter((identifier) => {
      return (
        before.definitions.get(identifier)?.fingerprint !==
        after.definitions.get(identifier)?.fingerprint
      )
    })
    .toSorted()
}

export function targetedReferenceBlocks(
  identifiers: readonly string[],
  ...indexes: DefinitionDependencyIndex[]
): string[] {
  const blocks = new Set<string>()
  identifiers.forEach((identifier) =>
    indexes.forEach((index) => {
      index.references.get(identifier)?.forEach((reference) => blocks.add(reference.blockId))
    }),
  )
  return [...blocks].toSorted()
}

export function prefixDefinitionContext(
  index: DefinitionDependencyIndex,
  dirtyStart: number,
): string {
  const tailIdentifiers = new Set<string>()
  index.references.forEach((references, identifier) => {
    if (references.some((reference) => reference.offset >= dirtyStart)) {
      tailIdentifiers.add(identifier)
    }
  })
  return [...tailIdentifiers]
    .map((identifier) => index.definitions.get(identifier))
    .filter((record): record is DefinitionRecord => Boolean(record && record.offset < dirtyStart))
    .toSorted((left, right) => left.offset - right.offset)
    .map((record) => record.source)
    .join('\n\n')
}

export function planM3bUpdate(previousRaw: string, nextRaw: string, dirtyStart: number): M3bPlan {
  const previous = parsePreview(previousRaw, { mode: 'M2' })
  const accepted = parsePreview(nextRaw, { mode: 'M2' })
  const beforeIndex = buildDefinitionDependencyIndex(previous)
  const afterIndex = buildDefinitionDependencyIndex(accepted)
  const changedIdentifiers = changedDefinitions(beforeIndex, afterIndex)
  return {
    accepted,
    changedIdentifiers,
    invalidatedBlockIds: targetedReferenceBlocks(changedIdentifiers, beforeIndex, afterIndex),
    prefixContext: prefixDefinitionContext(afterIndex, dirtyStart),
    safety: 'oracle-fallback',
  }
}
