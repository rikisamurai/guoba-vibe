import { TraceList } from './trace-list'
import type { LabState } from './types'

export function WirePanel({ state }: { state: LabState }) {
  return (
    <div className="lab2-wire-grid">
      <TraceList title={`WIRE CHUNKS · ${state.trace.wire.length}`}>
        {state.trace.wire.map((chunk) => (
          <li key={chunk.index}>
            <code>
              #{chunk.index} · {chunk.byteLength}B · +{chunk.delayMs}ms
            </code>
            <span>{chunk.preview || '∅'}</span>
            <small>{chunk.hex}</small>
          </li>
        ))}
      </TraceList>
      <div className="lab2-wire-stack">
        <TraceList title={`DECODED CHUNKS · ${state.trace.decoded.length}`}>
          {state.trace.decoded.map((chunk) => (
            <li key={chunk.index}>
              <code>
                #{chunk.index} · {chunk.byteLength}B
              </code>
              <span>{visibleWhitespace(chunk.text)}</span>
            </li>
          ))}
        </TraceList>
        <TraceList title={`SSE DISPATCH · ${state.trace.sse.length}`}>
          {state.trace.sse.map((event, index) => (
            // oxlint-disable-next-line react/no-array-index-key -- dispatch records have no protocol id
            <li key={index}>
              <code>#{index}</code>
              <span>{JSON.stringify(event)}</span>
            </li>
          ))}
        </TraceList>
        <TraceList title={`SSE LINES · ${state.trace.lines.length}`}>
          {state.trace.lines.map((line, index) => (
            // oxlint-disable-next-line react/no-array-index-key -- identical SSE lines need occurrence order
            <li key={`${index}-${line}`}>
              <code>{String(index).padStart(3, '0')}</code>
              <span>{line || '␤ dispatch'}</span>
            </li>
          ))}
        </TraceList>
      </div>
    </div>
  )
}

function visibleWhitespace(text: string): string {
  return text.replaceAll('\r', '␍').replaceAll('\n', '␊') || '∅'
}
