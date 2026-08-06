import { Link } from 'react-router-dom'

import { PageHero } from '../components/page-hero'
import { StreamingDemo } from '../components/streaming-demo'

export default function LabPage() {
  return (
    <div className="page lab-page">
      <PageHero
        compact
        eyebrow="WORKBENCH · DETERMINISTIC REPLAY"
        title="流式渲染实验台"
        lead="固定内容、固定切片、固定速度，只替换一个渲染策略。所有差异都能被解释，而不是凭手感比较。"
        actions={
          <Link className="text-link" to="/repro/broken-fence">
            载入故障样本 ↗
          </Link>
        }
      />
      <div className="workbench-grid">
        <StreamingDemo />
      </div>
    </div>
  )
}
