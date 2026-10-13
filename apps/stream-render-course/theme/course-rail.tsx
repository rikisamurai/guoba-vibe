import { Link, useLocation } from '@rspress/core/runtime'

import { courseParts, findLesson, orientationLesson, type CourseLesson } from './course-data'

function LessonLink({ lesson, active }: { lesson: CourseLesson; active: boolean }) {
  const content = (
    <>
      <span className="sr-rail__number">{lesson.marker}</span>
      <span>{lesson.title}</span>
    </>
  )

  if (!lesson.href) {
    return (
      <span className="sr-rail__lesson is-locked" aria-disabled="true">
        {content}
      </span>
    )
  }

  return (
    <Link
      className={`sr-rail__lesson${active ? ' is-active' : ''}`}
      to={lesson.href}
      aria-current={active ? 'page' : undefined}
    >
      {content}
    </Link>
  )
}

export function CourseRail() {
  const { pathname } = useLocation()
  const activeLesson = findLesson(pathname)

  return (
    <nav className="sr-course-rail" aria-label="课程章节">
      <p className="sr-rail-location">
        {activeLesson
          ? `正在阅读 ${activeLesson.marker} · ${activeLesson.shortTitle}`
          : '同一个项目，逐步解决真实问题'}
      </p>
      <Link className="sr-rail-resource" to="/setup">
        环境安装与运行
      </Link>
      <section className="sr-rail__part sr-rail__part--start">
        <h2>
          <span>START HERE</span>
          课程入口
        </h2>
        <div>
          <LessonLink lesson={orientationLesson} active={activeLesson?.number === 0} />
        </div>
      </section>

      {courseParts.map((part) => (
        <section className="sr-rail__part" key={part.label}>
          <h2>
            <span>{part.label}</span>
            {part.title}
          </h2>
          <div>
            {part.lessons.map((lesson) => (
              <LessonLink
                key={lesson.number}
                lesson={lesson}
                active={lesson.number === activeLesson?.number}
              />
            ))}
          </div>
        </section>
      ))}
    </nav>
  )
}
