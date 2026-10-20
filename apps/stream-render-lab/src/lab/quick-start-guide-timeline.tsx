import type { QuickStartGuideViewSnapshot } from './quick-start-guide-view'

interface Props {
  snapshot: QuickStartGuideViewSnapshot
}

export function QuickStartGuideTimeline({ snapshot }: Props) {
  const elapsedMs = snapshot.elapsedMs ?? 0
  const lanes = [
    {
      label: '读取 chunk',
      times: snapshot.streamChunkTimes ?? [],
      variant: 'stream',
    },
    {
      label: 'M0 显示文本状态更新',
      times: snapshot.pipelines.M0.visibleUpdateTimes ?? [],
      variant: 'baseline',
    },
    {
      label: 'M4 显示文本状态更新',
      times: snapshot.pipelines.M4.visibleUpdateTimes ?? [],
      variant: 'optimized',
    },
  ] as const
  const durationMs =
    snapshot.timelineDurationMs ?? Math.max(16, elapsedMs, ...lanes.flatMap(({ times }) => times))
  return (
    <section className="quick-guide__timeline" aria-label="读取响应流与显示文本状态更新时间线">
      <header>
        <strong>回放时间 {formatTime(elapsedMs)}</strong>
        <span>同一条 SSE 事件流</span>
      </header>
      {lanes.map(({ label, times, variant }) => (
        <div className="quick-guide__lane" key={label}>
          <span>{label}</span>
          <div
            className="quick-guide__track"
            data-variant={variant}
            role="img"
            aria-label={`${label}: ${times.length} 个时间点`}
          >
            {identifyTimes(times).map(({ id, time }) => (
              <i key={id} style={{ insetInlineStart: `${(time / durationMs) * 100}%` }} />
            ))}
          </div>
          <b>{times.length}</b>
        </div>
      ))}
    </section>
  )
}

function formatTime(milliseconds: number): string {
  return `${(Math.max(0, milliseconds) / 1_000).toFixed(2).padStart(5, '0')}s`
}

function identifyTimes(times: readonly number[]): Array<{ id: string; time: number }> {
  const occurrences = new Map<number, number>()
  return times.map((time) => {
    const occurrence = (occurrences.get(time) ?? 0) + 1
    occurrences.set(time, occurrence)
    return { id: `${time}-${occurrence}`, time }
  })
}
