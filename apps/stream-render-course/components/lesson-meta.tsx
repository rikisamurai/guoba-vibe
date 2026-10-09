import './lesson-meta.css'

interface LessonMetaProps {
  duration: string
  exercise: string
  prerequisites: readonly string[]
}

export function LessonMeta({ duration, exercise, prerequisites }: LessonMetaProps) {
  return (
    <dl className="lesson-meta" aria-label="本章学习信息">
      <div>
        <dt>预计时间</dt>
        <dd>{duration}</dd>
      </div>
      <div>
        <dt>你会完成</dt>
        <dd>{exercise}</dd>
      </div>
      <div>
        <dt>前置知识</dt>
        <dd>{prerequisites.join(' + ')}</dd>
      </div>
    </dl>
  )
}
