# Streaming renderer 隔离比较

核验日期：2026-08-06。

目标不是选一个库替换实验核心，而是让三种实现接受同一份 raw trace、相同 reveal cadence 与相同终态文本，然后只比较外部可观察结果。第三方 renderer 必须运行在独立 iframe entry；不得进入 `StreamingRenderEngine`、共享 React tree 或主 Bench bundle。

| 实现       | 重点观察                                                                                 | 本实验对应层              |
| ---------- | ---------------------------------------------------------------------------------------- | ------------------------- |
| Streamdown | incomplete Markdown repair、memoized rendering、可选 heavy plugins                       | repair、M2、M4            |
| Lobe UI    | `remend → marked` block split、cached Markdown、smooth queue、Profiler、stream highlight | M1、M2、Profiler、M4      |
| Markstream | multi-framework streaming parser/cache、streaming 与 final 路径                          | M2/M3 与 canonical settle |

统一输入 contract：

```ts
interface ExternalRendererDriver {
  update(raw: string, final: boolean, atMs: number): Promise<void>
  inspect(): {
    commits: number
    textContent: string
    longTasks: number
  }
  dispose(): void
}
```

`src/comparison/harness.ts` 已实现上述 driver contract：每个 adapter 获得完全相同的累计 raw 和唯一 final update；终态文本不等于 baseline 时，结果标记为 `terminalEquivalent: false`。具体第三方 mount 与依赖只存在于各自 iframe entry，不进入 core。

比较报告必须标出版本、浏览器、fixture、chunk cadence、warmup 与采样次数。终态 `textContent` 不一致时该组性能数据无效。第三方实现可以回答“产品库现在怎么做”，本实验自己的 M0–M4 才负责回答“为什么这样做”。

来源：

- [Streamdown](https://github.com/vercel/streamdown)
- [Lobe UI StreamdownRender](https://github.com/lobehub/lobe-ui/blob/master/src/Markdown/SyntaxMarkdown/StreamdownRender.tsx)
- [Lobe UI useStreamHighlight](https://github.com/lobehub/lobe-ui/blob/master/src/hooks/useStreamHighlight.ts)
- [Markstream](https://github.com/Simon-He95/markstream-vue)
