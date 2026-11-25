import type { CSSProperties, ReactNode } from 'react'

import type { HeavyArtifact, HeavyOutput } from '../heavy/types'

interface HeavyOutputProps {
  artifact?: HeavyArtifact
  kind: 'code' | 'math' | 'mermaid'
  source: string
  language?: string | null
  inline?: boolean
}

function tokenStyle(color?: string): CSSProperties | undefined {
  return color ? { color } : undefined
}

function renderOutput(output: HeavyOutput, inline: boolean, language?: string | null): ReactNode {
  if (output.kind === 'code') {
    let offset = 0
    return (
      <pre className="stream-code" data-language={language || 'text'}>
        <code>
          {output.tokens.map((token) => {
            offset += token.content.length
            return (
              <span key={`${offset}-${token.content}`} style={tokenStyle(token.color)}>
                {token.content}
              </span>
            )
          })}
        </code>
      </pre>
    )
  }
  const Tag = inline ? 'span' : 'div'
  return <Tag className="heavy-block" dangerouslySetInnerHTML={{ __html: output.html }} />
}

export function HeavyOutputView({
  artifact,
  kind,
  source,
  language,
  inline = false,
}: HeavyOutputProps) {
  const output = artifact?.status === 'complete' ? artifact.output : artifact?.lastGood
  if (output) {
    const Container = inline ? 'span' : 'div'
    return (
      <Container
        className={`heavy-result heavy-result--${kind} heavy-result--${artifact?.status ?? 'complete'}`}
      >
        {renderOutput(output, inline, language)}
        {artifact?.status === 'failed' ? <small>{artifact.error}</small> : null}
      </Container>
    )
  }
  const Tag = inline ? 'code' : 'pre'
  return (
    <Tag className={`heavy-block heavy-block--${artifact?.status ?? 'pending'}`}>
      {source}
      {artifact?.status === 'failed' ? <small>{artifact.error}</small> : null}
    </Tag>
  )
}
