import type { QuickStartGuideViewSnapshot } from './quick-start-guide-view'

interface Props {
  snapshot: QuickStartGuideViewSnapshot
}

export function NetworkReadingObservation({ snapshot }: Props) {
  const { progress } = snapshot
  return (
    <article className="quick-guide__observation" data-stage="reading-network">
      <header>
        <span>观察 1 · 读取响应流</span>
        <h3>先观察网络流片段怎样组成一条协议消息</h3>
      </header>
      <dl>
        <div>
          <dt>已读取 chunk</dt>
          <dd>
            {progress.streamChunksRead} / {progress.totalStreamChunks}
          </dd>
        </div>
        <div>
          <dt>SSE events</dt>
          <dd>{progress.sseEvents}</dd>
        </div>
        <div>
          <dt>delta.content 文本</dt>
          <dd>{progress.contentDeltas}</dd>
        </div>
      </dl>
      <p>
        {progress.sseEvents === 0
          ? '已经读取的片段还没有组成一个完整的 SSE event，所以模型内容还不会更新。'
          : '已经解析出 SSE event；继续观察它是否携带模型内容增量。'}
      </p>
    </article>
  )
}

export function VisibleUpdatedObservation({ snapshot }: Props) {
  const pipeline = snapshot.pipelines.M4
  const pending = pipeline.acceptedText.length - pipeline.visibleText.length
  return (
    <article className="quick-guide__observation" data-stage="visible-updated">
      <header>
        <span>观察 2 · 已接收文本已经显示</span>
        <h3>已接收文本现在已经显示</h3>
      </header>
      <dl>
        <div>
          <dt>已接收文本</dt>
          <dd>{pipeline.acceptedText.length} 个字符</dd>
        </div>
        <div>
          <dt>当前显示文本</dt>
          <dd>{pipeline.visibleText.length} 个字符</dd>
        </div>
        <div>
          <dt>等待显示</dt>
          <dd>{pending} 个字符</dd>
        </div>
      </dl>
      <p>刚才等待的文本已经进入 visible 状态。现在继续运行相同响应，最后再比较两种策略。</p>
    </article>
  )
}

export function PendingVisibleUpdate({ snapshot }: Props) {
  const pipeline = snapshot.pipelines.M4
  const pending = pipeline.acceptedText.length - pipeline.visibleText.length
  return (
    <article className="quick-guide__observation" data-stage="visible-update-pending">
      <header>
        <span>观察 2 · 文本已接收，等待显示</span>
        <h3>文本已经接收，但还没有全部显示</h3>
      </header>
      <dl>
        <div>
          <dt>已接收文本</dt>
          <dd>{pipeline.acceptedText.length} 个字符</dd>
        </div>
        <div>
          <dt>当前显示文本</dt>
          <dd>{pipeline.visibleText.length} 个字符</dd>
        </div>
        <div>
          <dt>等待显示</dt>
          <dd>{pending} 个字符</dd>
        </div>
      </dl>
      <p>
        已接收文本暂时领先当前显示文本，这不代表丢字。渲染策略会把已经接收的多次变化合并后再显示。
      </p>
    </article>
  )
}

export function SettledObservation({ snapshot }: Props) {
  const baseline = snapshot.pipelines.M0
  const optimized = snapshot.pipelines.M4
  const sameAccepted = baseline.acceptedText === optimized.acceptedText
  const sameVisible = baseline.visibleText === optimized.visibleText
  return (
    <article className="quick-guide__observation" data-stage="settled">
      <header>
        <span>观察 3 · 实验完成</span>
        <h3>先确认最终结果一致，再比较显示文本状态更新次数</h3>
      </header>
      <table aria-label="两种渲染策略的最终结果">
        <tbody>
          <tr>
            <th scope="row">最终接收文本</th>
            <td>{sameAccepted ? '相同' : '不同'}</td>
          </tr>
          <tr>
            <th scope="row">最终显示文本</th>
            <td>{sameVisible ? '相同' : '不同'}</td>
          </tr>
          <tr>
            <th scope="row">显示文本状态更新</th>
            <td>M0 {baseline.visibleUpdates} 次</td>
            <td>M4 {optimized.visibleUpdates} 次</td>
          </tr>
        </tbody>
      </table>
      <p>
        这里记录的是引擎中 visible 文本的状态变化，不等于 React 提交 DOM
        或浏览器绘制。这个实验只证明：在最终结果相同的前提下，M4
        产生了更少的显示文本状态更新；它没有证明 React
        渲染一定更快，真实浏览器性能要到性能分析页再测。
      </p>
    </article>
  )
}
