import { Link, useLocation } from '@rspress/core/runtime'
import { useEffect, useSyncExternalStore } from 'react'

import { courseParts, findLesson, orientationLesson, type CourseLesson } from './course-data'

function LessonLink({ lesson, active }: { lesson: CourseLesson; active: boolean }) {
  return (
    <Link
      className={`sr-rail__lesson${active ? ' is-active' : ''}`}
      to={lesson.href}
      aria-current={active ? 'page' : undefined}
      title={`${lesson.marker} · ${lesson.title}`}
    >
      <span className="sr-rail__number">{lesson.marker}</span>
      <span className="sr-rail__title">{lesson.title}</span>
    </Link>
  )
}

export function CourseRail() {
  const { pathname } = useLocation()
  const activeLesson = findLesson(pathname)
  const collapsed = useRailCollapsed()

  return (
    <nav className="sr-course-rail" aria-label="课程章节">
      <button
        type="button"
        className="sr-rail-toggle"
        aria-label={collapsed.value ? '展开目录' : '收起目录'}
        title={collapsed.value ? '展开目录' : '收起目录'}
        aria-expanded={!collapsed.value}
        onClick={collapsed.toggle}
      >
        <RailIcon collapsed={collapsed.value} />
      </button>
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

const storageKey = 'sr-rail-collapsed'
const listeners = new Set<() => void>()

function readCollapsed() {
  try {
    return localStorage.getItem(storageKey) === '1'
  } catch {
    return false
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// The static HTML is rendered expanded; the stored choice applies after hydration.
function useRailCollapsed() {
  const value = useSyncExternalStore(subscribe, readCollapsed, () => false)
  useEffect(() => {
    document.documentElement.classList.toggle('sr-rail-collapsed', value)
  }, [value])
  const toggle = () => {
    try {
      localStorage.setItem(storageKey, value ? '0' : '1')
    } catch {
      return
    }
    listeners.forEach((listener) => listener())
  }
  return { value, toggle }
}

function RailIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M9 4v16" />
      <path d={collapsed ? 'M14 10l2 2l-2 2' : 'M16 10l-2 2l2 2'} />
    </svg>
  )
}
