import { LESSON_DEMOS, isLessonDemoId } from '@stream-render/contract'
import { Link, useSearchParams } from 'react-router-dom'

import { BEGINNER_IDS, BeginnerDemo, isBeginnerDemo } from '../beginner/beginner-demo'

export default function PlaygroundPage() {
  const [params, setParams] = useSearchParams()
  const candidate = params.get('demo')
  const demoId = isLessonDemoId(candidate) && isBeginnerDemo(candidate) ? candidate : 'first-look'
  const course = import.meta.env.VITE_COURSE_ORIGIN ?? 'http://localhost:5173'
  return (
    <div className="beginner-page">
      <span className="beginner-meta">PLAYGROUND / 每次只改变一个变量</span>
      <h1>动手试一次，比记住术语更重要</h1>
      <p>
        先预测，再运行。这里不需要 API Key；字节和 SSE
        实验执行真实解析代码，时间对比使用明确标注的教学模型。
      </p>
      <nav className="beginner-tabs" aria-label="选择入门实验">
        {BEGINNER_IDS.map((id) => (
          <button
            type="button"
            key={id}
            aria-pressed={id === demoId}
            onClick={() => setParams({ demo: id })}
          >
            {LESSON_DEMOS[id].label}
          </button>
        ))}
      </nav>
      <BeginnerDemo key={demoId} demoId={demoId} />
      <p>
        <Link to="/project">下一步：通过真实 HTTP 运行 Mini Chat →</Link>
      </p>
      <p>
        <a href={`${course}/learn/00-quick-start`}>返回课程</a> ·{' '}
        <Link to="/lab">打开进阶实验台</Link>
      </p>
    </div>
  )
}
