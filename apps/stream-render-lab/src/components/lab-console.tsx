import type { ProviderId } from '../lib/chat-types'
import { RENDERERS } from '../lib/renderers'
import type { RendererId } from '../lib/renderers'
import { CONTENT_LABELS, WIRE_LABELS } from '../lib/replay-config'
import type { ContentStrategy, ReplayConfig, WireStrategy } from '../lib/replay-config'
import type { StreamMetrics } from '../lib/use-stream-session'

export type LabMode = 'live' | 'replay'

export interface LabConsoleProps {
  mode: LabMode
  onModeChange: (mode: LabMode) => void
  provider: ProviderId
  onProviderChange: (p: ProviderId) => void
  renderer: RendererId
  onRendererChange: (r: RendererId) => void
  mermaidLive: boolean
  onMermaidLiveChange: (v: boolean) => void
  replayConfig: ReplayConfig
  onReplayConfigChange: (c: ReplayConfig) => void
  onPlay: () => void
  onStop: () => void
  streaming: boolean
  metrics: StreamMetrics
}

const selectCls =
  'w-full rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm outline-none focus:border-indigo-500'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs text-neutral-500">{label}</span>
      {children}
    </label>
  )
}

export function LabConsole(props: LabConsoleProps) {
  const { mode, replayConfig, metrics, streaming } = props
  return (
    <aside className="bg-neutral-925 flex w-72 shrink-0 flex-col gap-4 overflow-y-auto border-l border-neutral-800 p-4">
      <h2 className="text-sm font-semibold text-neutral-300">◈ 实验控制台</h2>

      <Field label="模式">
        <div className="flex gap-1 rounded-md border border-neutral-700 p-0.5">
          {(['live', 'replay'] as const).map((m) => (
            <button
              key={m}
              onClick={() => props.onModeChange(m)}
              className={`flex-1 rounded px-2 py-1 text-sm ${
                mode === m ? 'bg-indigo-600' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {m === 'live' ? '真实模型' : '回放'}
            </button>
          ))}
        </div>
      </Field>

      {mode === 'live' && (
        <Field label="模型">
          <select
            className={selectCls}
            value={props.provider}
            onChange={(e) => props.onProviderChange(e.target.value as ProviderId)}
          >
            <option value="deepseek">DeepSeek</option>
            <option value="kimi">Kimi (k2.5)</option>
          </select>
        </Field>
      )}

      <Field label="渲染器">
        <select
          className={selectCls}
          value={props.renderer}
          onChange={(e) => props.onRendererChange(e.target.value as RendererId)}
        >
          {Object.entries(RENDERERS).map(([id, r]) => (
            <option key={id} value={id}>
              {r.label}
            </option>
          ))}
        </select>
      </Field>

      {props.renderer === 'p2' && (
        <label className="flex items-center gap-2 text-xs text-neutral-400">
          <input
            type="checkbox"
            checked={props.mermaidLive}
            onChange={(e) => props.onMermaidLiveChange(e.target.checked)}
          />
          Mermaid 流式渲染（实验）
        </label>
      )}

      {mode === 'replay' && (
        <div className="space-y-3 border-t border-neutral-800 pt-3">
          <Field label="内容切分">
            <select
              className={selectCls}
              value={replayConfig.content}
              onChange={(e) =>
                props.onReplayConfigChange({
                  ...replayConfig,
                  content: e.target.value as ContentStrategy,
                })
              }
            >
              {Object.entries(CONTENT_LABELS).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="线级切割">
            <select
              className={selectCls}
              value={replayConfig.wire}
              onChange={(e) =>
                props.onReplayConfigChange({
                  ...replayConfig,
                  wire: e.target.value as WireStrategy,
                })
              }
            >
              {Object.entries(WIRE_LABELS).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="速度">
            <select
              className={selectCls}
              value={replayConfig.speed}
              onChange={(e) =>
                props.onReplayConfigChange({ ...replayConfig, speed: Number(e.target.value) })
              }
            >
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={4}>4x</option>
              <option value={16}>16x</option>
            </select>
          </Field>
          {streaming ? (
            <button
              onClick={props.onStop}
              className="w-full rounded-md bg-red-600/80 py-2 text-sm hover:bg-red-600"
            >
              停止
            </button>
          ) : (
            <button
              onClick={props.onPlay}
              className="w-full rounded-md bg-indigo-600 py-2 text-sm hover:bg-indigo-500"
            >
              ▶ 播放压力样本
            </button>
          )}
        </div>
      )}

      <div className="space-y-1.5 border-t border-neutral-800 pt-3 text-xs text-neutral-400">
        <div className="text-neutral-500">指标</div>
        <MetricRow label="网络 chunk" value={metrics.networkChunks} />
        <MetricRow label="SSE 事件" value={metrics.sseEvents} />
        <MetricRow label="UI 提交" value={metrics.uiCommits} />
        <MetricRow label="耗时" value={`${(metrics.elapsedMs / 1000).toFixed(1)}s`} />
      </div>
    </aside>
  )
}

function MetricRow({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span className="font-mono text-neutral-200">{value}</span>
    </div>
  )
}
