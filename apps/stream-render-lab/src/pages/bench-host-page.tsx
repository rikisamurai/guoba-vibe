import { useState } from 'react'
import { Link } from 'react-router-dom'

import { PageHero } from '../components/page-hero'

export default function BenchHostPage() {
  const [generation, setGeneration] = useState(0)
  return (
    <div className="page bench-host-page">
      <PageHero
        compact
        eyebrow="BENCH CONTROLLER · ISOLATED ENTRY"
        title="可复现的渲染基准"
        lead="控制器与基准运行在两个 document。iframe 内不加载课程 Router、站点字体或 Shell，避免把教学站开销算进实验结果。"
        actions={
          <>
            <button
              className="text-link"
              onClick={() => setGeneration((value) => value + 1)}
              type="button"
            >
              重置独立 Bench
            </button>
            <Link className="text-link" to="/profiler">
              查看浏览器轨迹 ↗
            </Link>
          </>
        }
      />
      <section className="bench-frame-shell" aria-label="隔离的 Bench 文档">
        <header>
          <span>bench-frame.html</span>
          <code>document #{generation + 1}</code>
        </header>
        {/* oxlint-disable-next-line react/iframe-missing-sandbox -- trusted same-origin document is isolated for measurement, not security */}
        <iframe
          key={generation}
          src={`/bench-frame.html?generation=${generation}`}
          title="Streaming Render 独立 Bench"
        />
      </section>
    </div>
  )
}
