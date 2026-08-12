export interface TraceEvent {
  time: string
  kind: 'network' | 'parse' | 'commit'
  title: string
  detail: string
  cost: string
}

interface TraceTimelineProps {
  events?: TraceEvent[]
}

const EVENTS: TraceEvent[] = [
  { time: '0.0', kind: 'network', title: 'fetch body', detail: '217 bytes arrive', cost: '—' },
  { time: '4.6', kind: 'parse', title: 'SSE frame', detail: '2 complete events', cost: '0.4 ms' },
  {
    time: '16.7',
    kind: 'commit',
    title: 'React commit #24',
    detail: 'dirty tail only',
    cost: '3.8 ms',
  },
  {
    time: '32.9',
    kind: 'commit',
    title: 'React commit #25',
    detail: 'block 07 frozen',
    cost: '2.1 ms',
  },
]

export function TraceTimeline({ events = EVENTS }: TraceTimelineProps) {
  return (
    <ol className="trace-timeline" aria-label="渲染事件时间线">
      {events.map((event) => (
        <li
          key={`${event.time}-${event.title}`}
          className={`trace-event trace-event--${event.kind}`}
        >
          <time>
            {event.time}
            <small>ms</small>
          </time>
          <span className="trace-event__node" aria-hidden="true" />
          <div>
            <strong>{event.title}</strong>
            <span>{event.detail}</span>
          </div>
          <code>{event.cost}</code>
        </li>
      ))}
    </ol>
  )
}
