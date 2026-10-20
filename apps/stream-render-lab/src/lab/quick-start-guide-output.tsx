import { RenderDocumentView } from '../rendering/render-document'
import type { QuickStartGuideViewSnapshot } from './quick-start-guide-view'

type Profile = 'M0' | 'M4'

interface Props {
  pipeline: QuickStartGuideViewSnapshot['pipelines'][Profile]
  profile: Profile
}

export function QuickStartGuideOutput({ pipeline, profile }: Props) {
  const answer = pipeline.renderSnapshot?.parts.find((part) => part.kind === 'answer')
  const strategy = profile === 'M0' ? '逐增量更新（M0）' : '合并更新（M4）'
  return (
    <section className="quick-guide__output" data-profile={profile}>
      <header>
        <strong>{strategy}当前显示</strong>
        <dl>
          <div>
            <dt>已接收</dt>
            <dd>{pipeline.acceptedText.length}</dd>
          </div>
          <div>
            <dt>已显示</dt>
            <dd>{pipeline.visibleText.length}</dd>
          </div>
          <div>
            <dt>状态更新</dt>
            <dd>{pipeline.visibleUpdates}</dd>
          </div>
        </dl>
      </header>
      <div className="quick-guide__output-body">
        {answer ? (
          <RenderDocumentView
            document={answer.document}
            final={answer.ended}
            heavyArtifacts={pipeline.renderSnapshot?.heavyArtifacts}
            partId={answer.id}
            revision={pipeline.renderSnapshot?.revision}
            runId={pipeline.renderSnapshot?.runId}
          />
        ) : (
          <p>{pipeline.visibleText || '尚未显示文本'}</p>
        )}
      </div>
    </section>
  )
}
