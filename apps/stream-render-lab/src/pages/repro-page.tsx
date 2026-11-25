import { Link, useParams } from 'react-router-dom'

import { PageHero } from '../components/page-hero'
import { StreamingDemo } from '../components/streaming-demo'
import { getReproCase, REPRO_CASES } from '../repro/repro-cases'

export default function ReproPage() {
  const { case: caseId = 'broken-fence' } = useParams()
  const current = getReproCase(caseId)
  const caseNumber = Object.keys(REPRO_CASES).indexOf(current.id) + 4

  return (
    <div className="page repro-page">
      <PageHero
        compact
        eyebrow={`FAILURE ARCHIVE · CASE ${String(caseNumber).padStart(3, '0')}`}
        title={`最小复现：${current.title}`}
        lead={current.symptom}
        actions={
          <a className="text-link" href="#case-runner">
            运行本案例 ↓
          </a>
        }
        aside={
          <span className="case-severity">
            SEV
            <br />
            <strong>02</strong>
          </span>
        }
      />
      <section className="repro-sheet">
        <header>
          <div>
            <span>REPRODUCIBLE</span>
            <strong>FIXED</strong>
          </div>
          <div>
            <span>INPUT BYTES</span>
            <strong>{new TextEncoder().encode(current.raw).byteLength}</strong>
          </div>
          <div>
            <span>MIN CUTS</span>
            <strong>{String(current.cuts).padStart(2, '0')}</strong>
          </div>
        </header>
        <div className="repro-columns">
          <article>
            <p className="eyebrow">INPUT / RAW</p>
            <h2>让输入停在最糟的位置</h2>
            <pre className="repro-code">
              <code>{current.raw}</code>
            </pre>
            <ol className="repro-steps">
              {current.steps.map((step, index) => (
                <li key={step}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  {step}
                </li>
              ))}
            </ol>
          </article>
          <article>
            <p className="eyebrow">OBSERVATION</p>
            <h2>把症状和原因分开</h2>
            <div className="diagnosis-table">
              {current.diagnoses.map(({ label, text }) => (
                <div key={label}>
                  <span>{label}</span>
                  <p>{text}</p>
                </div>
              ))}
            </div>
          </article>
        </div>
        <div className="repro-runner" id="case-runner">
          <StreamingDemo
            ariaLabel={`${current.title} 的 M0 与 ${current.target} 真实重放`}
            challengerOptions={[current.target]}
            defaultChallenger={current.target}
            description="两个 pipeline 接收同一组带时间戳的真实 SourceEvent；读数来自当前运行。"
            heading={`运行 #${current.id} · M0 vs ${current.target}`}
            key={current.id}
            records={current.records}
            showDiagnostics
          />
        </div>
      </section>
      <nav className="case-nav" aria-label="故障案例切换">
        <span>RELATED CASES</span>
        {Object.values(REPRO_CASES).map((item, index) => (
          <Link key={item.id} to={`/repro/${item.id}`}>
            #{String(index + 4).padStart(3, '0')} {item.title.toUpperCase()}
          </Link>
        ))}
      </nav>
    </div>
  )
}
