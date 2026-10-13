import './lesson-meta.css'

interface LessonMetaProps {
  duration: string
  exercise: string
  prerequisites: readonly string[]
}

export function LessonMeta({ duration, exercise, prerequisites }: LessonMetaProps) {
  if (import.meta.env.SSG_MD) {
    return (
      <section>
        <h2>本章学习信息</h2>
        <ul>
          <li>
            <strong>预计时间：</strong>
            {duration}
          </li>
          <li>
            <strong>你会完成：</strong>
            {exercise}
          </li>
          <li>
            <strong>前置知识：</strong>
            {prerequisites.join(' + ')}
          </li>
        </ul>
      </section>
    )
  }
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
