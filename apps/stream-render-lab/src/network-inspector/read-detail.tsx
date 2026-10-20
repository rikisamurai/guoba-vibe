import type { TimedRecord } from './use-network-run'

export function ReadDetail({ record }: { record: TimedRecord }) {
  const stages = [
    {
      name: '原始 bytes',
      count: `${record.bytes.length} 字节`,
      value: record.bytes.map((byte) => byte.toString(16).padStart(2, '0')).join(' '),
      empty: record.eof ? 'EOF 没有新的字节；这里只冲刷剩余状态。' : '本次没有字节。',
    },
    {
      name: 'decoder 输出',
      count: `${record.decoded.length} 个 UTF-16 code units`,
      value: record.decoded ? JSON.stringify(record.decoded) : '',
      empty: '可能正在等待一个 UTF-8 字符的剩余字节。',
    },
    {
      name: 'SSE 完整事件的 data',
      count: `${record.events.length} 个事件`,
      value: record.events.join('\n\n'),
      empty: '没有派发完整事件。检查本次是否读全事件，以及解析器是否保留残片。',
    },
    {
      name: '接受的正文增量',
      count: `${record.text.length} 段正文`,
      value: record.text.map((text) => JSON.stringify(text)).join('\n'),
      empty: '没有新增正文；事件也可能只有完成标记或其他字段。',
    },
  ]
  return (
    <div className="network-stages" aria-label="所选读取的四层数据">
      {stages.map((stage, index) => (
        <section key={stage.name}>
          <h3>
            <span>{index + 1}</span> {stage.name} <small>{stage.count}</small>
          </h3>
          {stage.value ? <pre>{stage.value}</pre> : <p className="beginner-meta">{stage.empty}</p>}
        </section>
      ))}
    </div>
  )
}
