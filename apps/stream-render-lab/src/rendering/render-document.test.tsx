import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { HeavyArtifact } from '../heavy/types'
import { parseCanonical } from '../markdown'
import { RenderDocumentView, sameBlockArtifacts } from './render-document'

function codeArtifact(blockId: string, revision: number): HeavyArtifact {
  return {
    job: {
      key: `answer/${blockId}/root`,
      runId: 'run-1',
      blockId,
      revision,
      kind: 'code',
      source: 'code',
    },
    status: 'complete',
    output: { kind: 'code', tokens: [{ content: 'code' }] },
  }
}

describe('RenderDocumentView', () => {
  it('renders GFM structures from parser-neutral IR', () => {
    const document = parseCanonical('| A | B |\n| - | - |\n| 1 | 2 |')
    const html = renderToStaticMarkup(<RenderDocumentView document={document} />)
    expect(html).toContain('<table>')
    expect(html).toContain('<th>A</th>')
    expect(html).toContain('<td>2</td>')
  })

  it('escapes raw HTML instead of executing it', () => {
    const document = parseCanonical('<script>alert(1)</script>')
    const html = renderToStaticMarkup(<RenderDocumentView document={document} />)
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
  })

  it('drops unsafe link protocols', () => {
    const document = parseCanonical('[open](javascript:alert(1))')
    const html = renderToStaticMarkup(<RenderDocumentView document={document} />)
    expect(html).not.toContain('href=')
    expect(html).toContain('open')
  })

  it('keeps an unrelated stable block memo-safe when a heavy artifact changes', () => {
    const stable = codeArtifact('block-a', 1)
    const before = new Map([[stable.job.key, stable]])
    const changed = codeArtifact('block-b', 2)
    const after = new Map([...before, [changed.job.key, changed]])

    expect(sameBlockArtifacts(before, after, 'answer', 'block-a')).toBe(true)
    expect(sameBlockArtifacts(before, after, 'answer', 'block-b')).toBe(false)
  })

  it('preserves footnote references and definitions in canonical output', () => {
    const document = parseCanonical('claim[^proof]\n\n[^proof]: checked source')
    const html = renderToStaticMarkup(<RenderDocumentView document={document} />)

    expect(html).toContain('href="#footnote-proof"')
    expect(html).toContain('id="footnote-proof"')
    expect(html).toContain('checked source')
  })

  it('renders GFM alignment and distinguishes tight from loose lists', () => {
    const table = parseCanonical('| A | B |\n| :- | -: |\n| 1 | 2 |')
    const tight = parseCanonical('- a\n- b')
    const loose = parseCanonical('- a\n\n- b')

    expect(renderToStaticMarkup(<RenderDocumentView document={table} />)).toContain(
      'text-align:left',
    )
    expect(renderToStaticMarkup(<RenderDocumentView document={tight} />)).toContain('<li>a</li>')
    expect(renderToStaticMarkup(<RenderDocumentView document={loose} />)).toContain('<li><p>a</p>')
  })
})
