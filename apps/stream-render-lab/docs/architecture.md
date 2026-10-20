# 架构与不变量

## 1. 为什么是 deep module

外部只需要知道三件事：从哪里读流、用什么实验 profile、如何观察或取消一次 run。协议碎片、preview repair、frame batching、terminal drain、heavy-task guard 都藏在 engine 后面。

```ts
interface StreamSource {
  open(signal: AbortSignal): AsyncIterable<SourceEvent>
}

interface StreamingRenderEngine {
  start(input: {
    source: StreamSource
    profile: 'M0' | 'M1' | 'M2' | 'M3' | 'M4' | 'production'
    reveal: 'direct' | 'smooth'
    trace: 'off' | 'summary' | 'full'
  }): RenderRun
}
```

`RenderRun` 同时提供只读 snapshot store、永不因运行结果 reject 的 `settled`、显式 `cancel` 与调试用 `inspect`。只有非法启动参数可以同步抛错。

## 2. 数据面与控制面

```text
数据面
bytes → incremental UTF-8 decoder → WHATWG SSE parser
      → provider adapter → SourceEvent → internal sequencer
      → raw accumulator → preview projection → Render IR → React

控制面
EngineClock → ingest/replay → frame commit → drain/debounce/timeout
RunPhase    → connecting → streaming → draining → settling → settled
RunOutcome  → completed | incomplete | truncated | cancelled | failed
```

`RunPhase` 回答“引擎走到哪里”，`RunOutcome` 回答“来源最终发生了什么”。把二者拆开后，`incomplete` 或 `truncated` 也能走完 draining、canonical parse 和唯一 settled snapshot。

## 3. Clock 是第一天就存在的 seam

Core 不直接读取 `Date.now`、`performance.now`、rAF 或 timer：

- `BrowserClock` 驱动真实交互和正式浏览器报告；
- `VirtualClock` 暴露 `advanceBy`、`advanceFrame`、`runUntilIdle`；
- Replay 与 engine 共用同一个 Clock，避免“两套时间”；
- 同一测试不混用 VirtualClock、fake timers 与 Playwright Clock。

确定性测试断言 ordering、commit 数、debounce job 数与清理状态；真实 wall-clock 只报告 p50/p95、long task、CV/RME 等环境相关结果。

## 4. 四种互不混用的顺序

| 字段                         | 所属层                 | 含义                                       |
| ---------------------------- | ---------------------- | ------------------------------------------ |
| `internalSeq`                | engine                 | 归一化后事件的严格单调顺序                 |
| `sequenceNumber`             | Responses origin       | provider cursor，只在 Responses 中验证递增 |
| `blockIndex` / `choiceIndex` | provider origin        | 内容结构地址，不是全局顺序                 |
| `revision`                   | RenderSnapshot / block | React 可见版本，用于拒绝过期异步结果       |

一个 provider event 可以拆成多个 internal events，所以 snapshot 另存 `throughInternalSeq`，而不是把 React revision 冒充网络序号。

## 5. Raw、preview 与 canonical truth

`raw` 永远只是已经按序接受的 provider delta。未闭合强调、代码围栏等 repair 只存在于 preview projection，并通过 synthetic range 标记；它不能回写 raw。

无论 outcome 为何，终态都必须：

1. 排空已经接受但尚未 visible 的 raw；
2. 移除 synthetic repair；
3. 对 raw 执行一次 canonical full parse；
4. 完成或取消 terminal heavy work；
5. 发布且只发布一个 settled snapshot。

因此核心终态不变量是：

```text
normalize(M0.final(raw)) = … = normalize(M4.final(raw))
                         = normalize(canonicalFullParse(raw))
```

## 6. M3 的诚实边界

M3 不是 resumable CommonMark parser。它只在 root child 边界复用稳定前缀，并从上一次最后一个 root child 的 source start 对 dirty suffix 重新做完整 parse，然后 rebase position 并 stitch。

Preview 的 oracle 不变量是：

```text
normalize(M3.preview(prefix)) = normalize(M2.fullPreview(prefix))
```

如果 run 中出现 link/footnote definition，或全文 transform 未声明 incremental-safe，M3 回退 M2。巨型 paragraph、fence、list 或 blockquote 长期没有 root checkpoint 时也允许退化，但必须记录 `no_quiescent_checkpoint`。这不是性能 bug，而是局部解析可证明边界的一部分。

## 7. 模块地图

| 目录              | 单一职责                                                          |
| ----------------- | ----------------------------------------------------------------- |
| `src/engine`      | run 生命周期、Clock、visible cursor、snapshot store               |
| `src/protocol`    | UTF-8/SSE 后的 provider 归一化与顺序元数据                        |
| `src/replay`      | 使用 EngineClock 重放确定性 source events                         |
| `src/markdown`    | canonical parser、repair、M2/M3 projection、Render IR             |
| `src/heavy`       | debounce、增量高亮、revision-aware 异步门禁                       |
| `src/bench`       | 生成语料、VirtualClock workload、复杂度曲线                       |
| `src/rendering`   | 安全的 React block renderer 与 structural sharing                 |
| `src/worker`      | inline/Worker projection contract、session suffix 与 raw failover |
| `src/scheduler`   | 可注入 capability 的 adaptive frame-budget 实验                   |
| `src/fuzz`        | byte、SSE、protocol、Markdown 与 Clock property tests             |
| `src/long-output` | content-visibility 与 measured windowing 实验                     |
| `src/comparison`  | 第三方 renderer 的隔离输入与终态等价 contract                     |
| `api`             | live 开关、白名单、abort 与 byte passthrough                      |

依赖方向始终朝向小的类型契约；UI 可以订阅 engine，但 protocol 与 Markdown 不认识 React。

## 8. Bench 的测量模型

复杂度检查测量 `previewParsedCodeUnits`，而不是机器速度。固定 chunk/cadence/frame/seed 后：

- M2 每次 commit 重新 parse 全文，累计工作量随内容规模近似二次增长；
- M3 在 checkpoint-rich corpus 中只 parse 有界尾部，累计工作量近似线性；
- canonical terminal parse 始终单独记作 O(n)，不掺入 preview 曲线；
- no-checkpoint corpus 中 M3 应显式退化，不能伪报 suffix 优化。

多规模曲线用于识别数量级；单个 N→2N 比值只是 regression heuristic，不是对 CommonMark 内容分布的普遍承诺。
