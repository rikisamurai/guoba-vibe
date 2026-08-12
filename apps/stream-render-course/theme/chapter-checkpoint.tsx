import { useLocation } from '@rspress/core/runtime'

import { findLesson } from './course-data'

export function ChapterCheckpoint() {
  const lesson = findLesson(useLocation().pathname)
  if (!lesson) return null

  return (
    <section className="sr-checkpoint" aria-labelledby="sr-checkpoint-title">
      <span className="sr-checkpoint__eyebrow">LEARNING CHECK</span>
      <h2 id="sr-checkpoint-title">本章 Checkpoint</h2>
      <p>完成这一章后，你应该能：</p>
      <ul>
        {lesson.checkpoints.map((checkpoint) => (
          <li key={checkpoint}>
            <i aria-hidden="true" />
            {checkpoint}
          </li>
        ))}
      </ul>
      <a href="#checkpoint">
        跳到本章检查 <span aria-hidden="true">↓</span>
      </a>
    </section>
  )
}
