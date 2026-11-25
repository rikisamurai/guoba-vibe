import { createElement, type ReactNode } from 'react'

import { heavyJobKey } from '../heavy/plan'
import type { HeavyArtifact } from '../heavy/types'
import type { RenderNode } from '../markdown/types'
import { HeavyOutputView } from './heavy-output'
import { safeUrl } from './safe-url'

export interface NodeRenderContext {
  runId: string
  blockId: string
  revision: number
  final: boolean
  partId: string
  artifacts: ReadonlyMap<string, HeavyArtifact>
  tightList?: boolean
}

function children(node: RenderNode, context: NodeRenderContext, path: string): ReactNode[] {
  return (node.children ?? []).map((child, index) => renderNode(child, context, `${path}.${index}`))
}

function renderTable(node: RenderNode, context: NodeRenderContext, path: string): ReactNode {
  const rows = node.children ?? []
  const renderRow = (row: RenderNode, header: boolean, index: number) => (
    <tr key={`${path}.${index}`}>
      {(row.children ?? []).map((cell, cellIndex) =>
        createElement(
          header ? 'th' : 'td',
          {
            key: `${path}.${index}.${cellIndex}`,
            style: node.align?.[cellIndex] ? { textAlign: node.align[cellIndex] } : undefined,
          },
          children(cell, context, `${path}.${index}.${cellIndex}`),
        ),
      )}
    </tr>
  )
  return (
    <table key={path}>
      {rows[0] ? <thead>{renderRow(rows[0], true, 0)}</thead> : null}
      <tbody>{rows.slice(1).map((row, index) => renderRow(row, false, index + 1))}</tbody>
    </table>
  )
}

function renderList(node: RenderNode, context: NodeRenderContext, path: string): ReactNode {
  const tag = node.ordered ? 'ol' : 'ul'
  const listContext = { ...context, tightList: !node.spread }
  const items = (node.children ?? []).map((child, index) =>
    renderNode(child, listContext, `${path}.${index}`),
  )
  return createElement(tag, { key: path, start: node.start ?? undefined }, items)
}

function renderListItem(
  node: RenderNode,
  context: NodeRenderContext,
  path: string,
  key: string,
): ReactNode {
  const content = context.tightList
    ? (node.children ?? []).flatMap((child, index) =>
        child.type === 'paragraph'
          ? children(child, context, `${path}.${index}`)
          : [renderNode(child, context, `${path}.${index}`)],
      )
    : children(node, context, path)
  return (
    <li key={key} className={node.checked === null ? undefined : 'task-list-item'}>
      {node.checked === null ? null : (
        <input type="checkbox" checked={Boolean(node.checked)} readOnly />
      )}
      {content}
    </li>
  )
}

function footnoteId(identifier?: string): string {
  return `footnote-${encodeURIComponent(identifier ?? 'note')}`
}

function renderHeavy(node: RenderNode, context: NodeRenderContext, path: string): ReactNode {
  const kind =
    node.type === 'code' && node.lang === 'mermaid'
      ? 'mermaid'
      : node.type === 'code'
        ? 'code'
        : 'math'
  const artifact = context.artifacts.get(heavyJobKey(context.partId, context.blockId, path))
  return (
    <HeavyOutputView
      artifact={artifact}
      inline={node.type === 'inlineMath'}
      key={path}
      kind={kind}
      language={node.lang}
      source={node.value ?? ''}
    />
  )
}

export function renderNode(node: RenderNode, context: NodeRenderContext, path = 'root'): ReactNode {
  const key = `${node.position?.start.offset ?? node.type}-${path}`
  const nested = children(node, context, path)
  switch (node.type) {
    case 'text':
      return node.value ?? ''
    case 'paragraph':
      return <p key={key}>{nested}</p>
    case 'emphasis':
      return <em key={key}>{nested}</em>
    case 'strong':
      return <strong key={key}>{nested}</strong>
    case 'delete':
      return <del key={key}>{nested}</del>
    case 'inlineCode':
      return <code key={key}>{node.value}</code>
    case 'code':
      return renderHeavy(node, context, path)
    case 'inlineMath':
    case 'math':
      return renderHeavy(node, context, path)
    case 'blockquote':
      return <blockquote key={key}>{nested}</blockquote>
    case 'list':
      return renderList(node, context, path)
    case 'listItem':
      return renderListItem(node, context, path, key)
    case 'heading':
      return createElement(`h${node.depth ?? 2}`, { key }, nested)
    case 'link': {
      const href = safeUrl(node.url)
      return href ? (
        <a
          href={href}
          key={key}
          rel="noreferrer"
          target={href.startsWith('http') ? '_blank' : undefined}
        >
          {nested}
        </a>
      ) : (
        <span key={key}>{nested}</span>
      )
    }
    case 'image': {
      const src = safeUrl(node.url)
      return src ? (
        <img
          alt={node.alt ?? ''}
          key={key}
          loading="lazy"
          src={src}
          title={node.title ?? undefined}
        />
      ) : null
    }
    case 'break':
      return <br key={key} />
    case 'thematicBreak':
      return <hr key={key} />
    case 'table':
      return renderTable(node, context, path)
    case 'footnoteReference':
      return (
        <sup key={key}>
          <a href={`#${footnoteId(node.identifier)}`}>[{node.identifier}]</a>
        </sup>
      )
    case 'footnoteDefinition':
      return (
        <aside className="footnote-definition" id={footnoteId(node.identifier)} key={key}>
          <span>{node.identifier}.</span>
          {nested}
        </aside>
      )
    case 'definition':
      return null
    default:
      return (
        <span key={key}>
          {node.value}
          {nested}
        </span>
      )
  }
}
