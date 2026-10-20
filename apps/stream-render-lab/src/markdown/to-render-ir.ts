import type { Nodes, Root } from 'mdast'

import type { RenderBlock, RenderNode, RenderPosition } from './types'

type Definition = { url: string; title?: string | null }
type NodePosition = NonNullable<Nodes['position']>

function positionOf(
  position: NodePosition | undefined,
  offsetBase: number,
  lineBase: number,
): RenderPosition | undefined {
  if (position?.start.offset === undefined || position.end.offset === undefined) return undefined
  return {
    start: {
      line: position.start.line + lineBase,
      column: position.start.column,
      offset: position.start.offset + offsetBase,
    },
    end: {
      line: position.end.line + lineBase,
      column: position.end.column,
      offset: position.end.offset + offsetBase,
    },
  }
}

function childrenOf(node: Nodes): Nodes[] {
  return 'children' in node ? node.children : []
}

function collectDefinitions(node: Nodes, definitions: Map<string, Definition>): void {
  if (node.type === 'definition' && !definitions.has(node.identifier)) {
    definitions.set(node.identifier, { url: node.url, title: node.title })
  }
  childrenOf(node).forEach((child) => collectDefinitions(child, definitions))
}

function resolvedType(node: Nodes, definition?: Definition): string {
  if (node.type === 'html') return 'text'
  if (node.type === 'linkReference' && definition) return 'link'
  if (node.type === 'imageReference' && definition) return 'image'
  return node.type
}

export function toRenderNode(
  node: Nodes,
  offsetBase = 0,
  lineBase = 0,
  definitions = new Map<string, Definition>(),
): RenderNode {
  const identifier = 'identifier' in node ? node.identifier : undefined
  const definition = identifier ? definitions.get(identifier) : undefined
  const result: RenderNode = {
    type: resolvedType(node, definition),
    position: positionOf(node.position, offsetBase, lineBase),
  }
  const children = childrenOf(node)
  if (children.length > 0) {
    result.children = children.map((child) => {
      return toRenderNode(child, offsetBase, lineBase, definitions)
    })
  }
  if ('value' in node) result.value = node.value
  if ('url' in node) result.url = node.url
  if ('title' in node) result.title = node.title
  if ('alt' in node) result.alt = node.alt
  if ('lang' in node) result.lang = node.lang
  if ('meta' in node) result.meta = node.meta
  if ('depth' in node) result.depth = node.depth
  if ('checked' in node) result.checked = node.checked
  if ('spread' in node) result.spread = node.spread
  if ('ordered' in node) result.ordered = node.ordered
  if ('start' in node) result.start = node.start
  if ('align' in node) result.align = node.align
  if (identifier !== undefined) result.identifier = identifier
  if ('referenceType' in node) result.referenceType = node.referenceType
  if (definition) {
    result.url = definition.url
    result.title = definition.title ?? null
  }
  return result
}

export function rootToBlocks(root: Root, raw: string, offsetBase = 0, lineBase = 0): RenderBlock[] {
  const definitions = new Map<string, Definition>()
  collectDefinitions(root, definitions)
  return root.children.map((child, index) => {
    const localStart = index === 0 ? 0 : (child.position?.start.offset ?? 0)
    const next = root.children[index + 1]
    const localEnd = next?.position?.start.offset ?? raw.length
    const start = offsetBase + localStart
    const end = offsetBase + localEnd
    return {
      id: `block-${start}-${child.type}`,
      type: child.type,
      raw: raw.slice(localStart, localEnd),
      range: { start, end },
      node: toRenderNode(child, offsetBase, lineBase, definitions),
    }
  })
}
