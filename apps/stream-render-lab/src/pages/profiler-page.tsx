import { Profiler, useState } from 'react'

import { DEFAULT_AB_CONFIG, type AbProfileConfig } from '../profiler/ab-types'
import { ProfileConfigPanel } from '../profiler/profile-config-panel'
import { MetricReadingGuide, ProfileIdlePanel } from '../profiler/profile-idle-panel'
import { ProfileResults } from '../profiler/profile-results'
import { useAbProfile } from '../profiler/use-ab-profile'
import { RenderDocumentView } from '../rendering/render-document'

export default function ProfilerPage() {
  const [config, setConfig] = useState<AbProfileConfig>(DEFAULT_AB_CONFIG)
  const profile = useAbProfile()
  const answer = profile.snapshot?.parts.find((part) => part.kind === 'answer')
  const production = import.meta.env.PROD
  const courseOrigin = import.meta.env.VITE_COURSE_ORIGIN ?? 'http://localhost:5173'

  function exportReport(): void {
    if (!profile.report) return
    const url = URL.createObjectURL(
      new Blob([JSON.stringify({ config, report: profile.report }, null, 2)], {
        type: 'application/json',
      }),
    )
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `stream-render-profile-${Date.now()}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="tool-page profiler-v2-page">
      <header className="tool-heading profiler-heading">
        <div>
          <p className="eyebrow">GUIDED A/B PROFILER</p>
          <h1>先声明测什么，再点击开始</h1>
          <p>一次实验只改变一个变量。页面不会自动运行，也不会把开发构建的数据伪装成正式结论。</p>
        </div>
        <a className="tool-lesson-link" href={courseOrigin}>
          <small>配套课程</small>
          <strong>17 · 如何读性能数据</strong>
          <span>打开教程 ↗</span>
        </a>
      </header>

      {production ? null : (
        <div className="profile-build-warning" role="note">
          <strong>当前为 development build</strong>
          <span>可以学习采样流程；正式性能结论请使用 production profiling build。</span>
          <code>
            pnpm --filter stream-render-lab build &amp;&amp; pnpm --filter stream-render-lab preview
          </code>
        </div>
      )}

      {profile.report ? (
        <ProfileResults
          onExport={exportReport}
          onReset={profile.reset}
          production={production}
          report={profile.report}
        />
      ) : (
        <>
          <section className="profile-setup-grid">
            <ProfileConfigPanel
              config={config}
              onChange={setConfig}
              onStart={() => profile.run(config)}
              progress={profile.progress}
              running={profile.running}
            />
            <ProfileIdlePanel {...profile.progress} />
          </section>
          <MetricReadingGuide />
        </>
      )}

      <Profiler id="ab-profile-output" onRender={profile.onRender}>
        <section className="profile-measure-target" aria-label="当前被测渲染输出">
          <header>
            <span>{profile.currentProfile ?? 'IDLE'} pipeline</span>
            <strong>{profile.snapshot?.phase ?? '等待开始'}</strong>
          </header>
          {answer ? (
            <RenderDocumentView
              document={answer.document}
              final={profile.snapshot?.phase === 'settled'}
              heavyArtifacts={profile.snapshot?.heavyArtifacts}
              partId={answer.id}
              revision={profile.snapshot?.revision}
              runId={profile.snapshot?.runId}
            />
          ) : (
            <p>开始采样后，这里显示当前 run；它也是 React Profiler 的真实测量边界。</p>
          )}
        </section>
      </Profiler>
    </div>
  )
}
