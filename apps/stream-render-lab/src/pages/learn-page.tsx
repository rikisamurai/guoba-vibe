import { Link, Navigate, useParams } from 'react-router-dom'

import { PageHero } from '../components/page-hero'
import { getChapterExperiment } from '../learn/chapter-experiments'
import { ChapterLiveInspector } from '../learn/chapter-live-inspector'
import { CHAPTERS, getChapter } from '../learn/chapters'
import { lessonComponents } from '../learn/lesson-components'

const LESSON_STEPS = [
  '观察失败',
  '实现一个增量',
  '确定性验证',
  '浏览器观察',
  'Invariant / trade-off',
]

export default function LearnPage() {
  const { chapter: slug = 'quick-start' } = useParams()
  const match = getChapter(slug)

  if (match === undefined) {
    return <Navigate replace to="/learn/quick-start" />
  }

  const { chapter, index } = match
  const experiment = getChapterExperiment(chapter.slug)
  const previous = CHAPTERS[index - 1]
  const next = CHAPTERS[index + 1]
  const Content = chapter.Content

  return (
    <div className="page lesson-page">
      <PageHero
        compact
        eyebrow={`CHAPTER ${chapter.index} · ${chapter.eyebrow}`}
        title={chapter.title}
        lead={chapter.lead}
        aside={
          <div className="chapter-number" aria-label={`第 ${chapter.index} 章，共 12 章`}>
            {chapter.index}
            <span>/ 12</span>
          </div>
        }
      />
      <div className="lesson-layout">
        <aside className="margin-note" aria-label="本章学习环">
          <p>LEARNING LOOP</p>
          <ol>
            {LESSON_STEPS.map((step, stepIndex) => (
              <li className={stepIndex === 0 ? 'is-current' : undefined} key={step}>
                {step}
              </li>
            ))}
          </ol>
          <Link to="/lab">打开配套实验 ↗</Link>
        </aside>
        <article className="lesson-copy lesson-mdx">
          <Content components={lessonComponents} />
        </article>
        {experiment === undefined ? null : (
          <ChapterLiveInspector experiment={experiment} key={chapter.slug} slug={chapter.slug} />
        )}
      </div>
      <nav className="chapter-nav" aria-label="章节切换">
        {previous === undefined ? (
          <Link to="/">← 返回 12 章目录</Link>
        ) : (
          <Link to={`/learn/${previous.slug}`}>← 上一章：{previous.shortTitle}</Link>
        )}
        {next === undefined ? (
          <Link to="/lab">完成课程：打开实验台 →</Link>
        ) : (
          <Link to={`/learn/${next.slug}`}>下一章：{next.shortTitle} →</Link>
        )}
      </nav>
    </div>
  )
}
