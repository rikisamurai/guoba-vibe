import { Link } from 'react-router-dom'

import { ManualCard } from '../components/manual-card'
import { Oscilloscope } from '../components/oscilloscope'
import { PageHero } from '../components/page-hero'
import { CHAPTERS } from '../learn/chapters'

export default function HomePage() {
  return (
    <div className="page home-page">
      <PageHero
        eyebrow="FIELD MANUAL 001 · BROWSER / REACT"
        title="把流式回答拆成看得见的系统"
        lead="不是再造一个聊天框，而是建立一座可以暂停、重放、测量的实验室：亲手观察字节、事件、文本、区块与 React commit 如何接力。"
        actions={
          <>
            <Link className="primary-link" to="/learn/quick-start">
              从第一章开始 <span>→</span>
            </Link>
            <Link className="text-link" to="/lab">
              直接进入实验台
            </Link>
          </>
        }
        aside={<Oscilloscope caption="原理示意（非实测）：同一份内容，两只不同的时钟" />}
      />

      <section className="manifesto-strip" aria-label="学习原则">
        <p>
          <span>原则 A</span> 原始文本永远是事实
        </p>
        <p>
          <span>原则 B</span> 每次实验必须可重放
        </p>
        <p>
          <span>原则 C</span> 性能结论必须可观察
        </p>
      </section>

      <section aria-label="12 章流式渲染课程" className="lesson-section">
        <header className="section-heading">
          <div>
            <p className="eyebrow">LEARNING PATH</p>
            <h2>从一根网络线，走到稳定的富文本</h2>
          </div>
          <p>12 章共用一个学习环：观察失败、增加一层、确定性验证、总结退化。</p>
        </header>
        <div className="manual-grid curriculum-grid">
          {CHAPTERS.map((chapter) => (
            <ManualCard
              description={chapter.description}
              index={chapter.index}
              key={chapter.slug}
              meta={`${chapter.eyebrow} · ${chapter.duration}`}
              title={chapter.shortTitle}
              to={`/learn/${chapter.slug}`}
            />
          ))}
        </div>
      </section>

      <section className="field-note">
        <div className="field-note__mark">
          NOTE
          <br />
          07
        </div>
        <div>
          <p className="eyebrow">WHY THIS LAB EXISTS</p>
          <h2>真正的竞争力，不是背出库名。</h2>
          <p>
            你最终应能解释：为什么一个半截代码围栏会让页面抖动、为什么 requestAnimationFrame
            不是万能答案、为什么 Mermaid 需要自己的调度时钟。
          </p>
        </div>
        <Link className="primary-link primary-link--ink" to="/repro/broken-fence">
          查看故障档案 →
        </Link>
      </section>
    </div>
  )
}
