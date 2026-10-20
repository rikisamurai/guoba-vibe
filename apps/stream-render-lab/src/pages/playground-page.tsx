import { LESSON_DEMOS, isLessonDemoId } from '@stream-render/contract'
import { Link, useSearchParams } from 'react-router-dom'

import { BEGINNER_IDS, BeginnerDemo, isBeginnerDemo } from '../beginner/beginner-demo'
import NetworkInspector from '../network-inspector/network-inspector'

export default function PlaygroundPage() {
  const [params, setParams] = useSearchParams()
  const candidate = params.get('demo')
  const demoId =
    candidate === 'network-inspector'
      ? candidate
      : isLessonDemoId(candidate) && isBeginnerDemo(candidate)
        ? candidate
        : 'network-inspector'
  const course = import.meta.env.VITE_COURSE_ORIGIN ?? 'http://localhost:5173'
  return (
    <div className="beginner-page">
      <span className="beginner-meta">PLAYGROUND / 每次只改变一个变量</span>
      <h1>把一次读取，追到屏幕上的文字</h1>
      <p>
        先预测，再运行。这里不需要 API Key；字节和 SSE
        实验执行真实解析代码，时间对比使用明确标注的教学模型。
      </p>
      <nav className="beginner-tabs" aria-label="选择实验">
        <button
          type="button"
          aria-pressed={demoId === 'network-inspector'}
          onClick={() =>
            setParams({ demo: 'network-inspector', source: params.get('source') ?? 'mine' })
          }
        >
          网络观测
        </button>
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
      {demoId === 'network-inspector' ? (
        <NetworkInspector />
      ) : (
        <BeginnerDemo key={demoId} demoId={demoId} />
      )}
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
