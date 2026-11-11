import { useState } from 'react'

import { ReadDetail } from './read-detail'
import { useNetworkRun, type NetworkSource } from './use-network-run'

import '../beginner/beginner.css'
import './network-inspector.css'

export default function NetworkInspector() {
  const [source, setSource] = useState<NetworkSource>(() =>
    new URLSearchParams(window.location.search).get('source') === 'reference'
      ? 'reference'
      : 'mine',
  )
  const [mode, setMode] = useState('stream')
  const [selected, setSelected] = useState<number | null>(null)
  const run = useNetworkRun()
  const selectedIndex = selected ?? run.records.length - 1
  const record = run.records[selectedIndex]
  const reads = run.records.filter((entry) => !entry.eof)
  return (
    <section className="beginner-demo network-inspector" aria-label="网络观测">
      <h2>沿着一次真实读取，看文字怎样到达</h2>
      <p>
        请求本地教学 HTTP 接口，运行你选择的 Mini Chat 读取代码。点选一条
        read，查看它实际产生的四层数据。
      </p>
      <div className="beginner-controls">
        <label>
          代码来源{' '}
          <select
            aria-label="观测代码来源"
            value={source}
            disabled={run.busy}
            onChange={(event) => {
              run.reset()
              setSelected(null)
              setSource(event.target.value === 'reference' ? 'reference' : 'mine')
            }}
          >
            <option value="mine">我的实现</option>
            <option value="reference">参考实现</option>
          </select>
        </label>
        <label>
          HTTP 场景{' '}
          <select
            aria-label="HTTP 场景"
            value={mode}
            disabled={run.busy}
            onChange={(event) => {
              run.reset()
              setSelected(null)
              setMode(event.target.value)
            }}
          >
            <option value="stream">分段发送</option>
            <option value="split">刻意拆分中文与事件</option>
            <option value="buffered">缓冲后一次发送</option>
            <option value="truncated">缺少完成标记的 EOF</option>
            <option value="error">HTTP 503</option>
          </select>
        </label>
        <button
          disabled={run.busy}
          onClick={() => {
            setSelected(null)
            void run.run(mode, source)
          }}
        >
          发起请求
        </button>
        <button disabled={!run.busy} onClick={run.stop}>
          停止
        </button>
      </div>
      <p className="beginner-meta">
        {source === 'mine' ? '当前代码：src/my-chat/' : '当前代码：src/reference-chat/'} · 与 Mini
        Chat、验收使用相同实现
      </p>
      <p role="status" className="network-status">
        {run.status} · {reads.length} 次 read ·{' '}
        {reads.reduce((total, entry) => total + entry.bytes.length, 0)} 字节
      </p>
      {record ? (
        <div className="network-trace">
          <div className="network-reads" aria-label="实际读取记录">
            {run.records.map((entry, index) => (
              <button
                key={entry.index}
                aria-pressed={selectedIndex === index}
                onClick={() => setSelected(index)}
              >
                <strong>{entry.eof ? 'EOF · 冲刷' : `read #${entry.index + 1}`}</strong>
                <small>
                  {entry.bytes.length} B · +{entry.receivedAt} ms
                </small>
              </button>
            ))}
          </div>
          <ReadDetail record={record} />
        </div>
      ) : (
        <p className="network-empty">发起请求后，在这里逐条查看实际的读取边界。</p>
      )}
      <div className="network-answer">
        <h3>本次累计正文</h3>
        <pre>{run.text || '还没有正文'}</pre>
      </div>
      <p className="beginner-note">
        这里观测的是浏览器 reader.read()，不是 TCP
        包或服务端写入次数。代理和浏览器可能合并字节；拆分场景也不保证固定的 read
        数量。耗时从发起请求计时，不代表屏幕绘制。
        终态显示当前代码返回的判断，是否正确由验收用例验证。
      </p>
    </section>
  )
}
