import {
  LESSON_DEMOS,
  isDemoPresetPair,
  isLessonDemoId,
  type LessonPresetId,
} from '@stream-render/contract'
import { useSearchParams } from 'react-router-dom'

import { LabWorkbench } from '../lab/lab-workbench'
import { LAB_PRESETS } from '../lab/presets'

export default function LabPage() {
  const [search] = useSearchParams()
  const demo = search.get('demo')
  const requested = search.get('preset')
  const initialPreset = resolvePreset(demo, requested)
  return (
    <div className="page lab2-page">
      <header className="lab2-hero">
        <p>STREAMING WORKBENCH</p>
        <h1>一条输入，拆开看每一层变化</h1>
        <span>编辑内容、控制 wire 行为，再用同一个 replay 比较两条渲染 pipeline。</span>
        <small>两侧共享主线程，延迟只用于观察；正式性能结论请在隔离的 Profiler 中采样。</small>
      </header>
      <LabWorkbench key={initialPreset} initialPreset={initialPreset} />
    </div>
  )
}

function resolvePreset(demo: string | null, preset: string | null): LessonPresetId {
  if (isLessonDemoId(demo)) {
    return isDemoPresetPair(demo, preset) ? preset : LESSON_DEMOS[demo].defaultPreset
  }
  return LAB_PRESETS.find((candidate) => candidate.id === preset)?.id ?? 'quick-start-burst'
}
