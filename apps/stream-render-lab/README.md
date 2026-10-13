# Streaming Render Lab

面向 React 浏览器端的 Streaming Render 工具站：用真实协议、确定性回放和可解释的工作量指标，让 Lab、Profiler、Chat 和 Bench 各自回答一类问题。教学文档独立在 `apps/stream-render-course`，本应用只通过类型化 embed contract 提供课内实验。

## 工具范围

工具站暴露这条真实数据链：

```text
bytes → UTF-8 → WHATWG SSE → provider adapter → typed events
      → internal sequencer → render engine → Markdown preview → React
```

核心实验是 M0–M4：

| 模式       | 本章只增加一个变量                                    |
| ---------- | ----------------------------------------------------- |
| M0         | 每个 delta 全文 parse/render，建立正确但昂贵的基线    |
| M1         | 使用 Clock 驱动 frame batching，并正确 drain          |
| M2         | preview repair、block identity、structural sharing    |
| M3         | root suffix reparse、AST stitching、全局语义 fallback |
| M4         | revision-aware Shiki、Mermaid、KaTeX heavy work       |
| production | M4 + direct frame-batched reveal；smooth 仅用于实验   |

## 本地运行

在 monorepo 根目录：

```bash
pnpm install
pnpm --filter stream-render-lab dev
pnpm --filter stream-render-lab test
pnpm --filter stream-render-lab test:bench
pnpm --filter stream-render-lab test:e2e
pnpm --filter stream-render-lab lesson 01 test
pnpm --filter stream-render-lab lesson 04 test
pnpm --filter stream-render-lab lesson 06 test
pnpm --filter stream-render-lab lesson 10 test
```

页面入口：`/lab`、`/profiler`、`/chat`、`/bench`、`/embed/:demoId`。内部还保留 `/repro/:case` 故障复现路由。`/embed/:demoId` 仅接受 manifest 注册的 demo/preset；`/bench` 控制 iframe 中独立的 `bench-frame.html` entry，以减少文档 Shell、字体和 Router 对浏览器报告的干扰。

## 贯穿课程的 Mini Chat

- `/project?source=mine`：默认运行 `src/my-chat/`，通过真实 HTTP 接收固定回答；支持停止、重试、Markdown、缓冲、截断和 HTTP 错误。
- `/project?source=reference`：独立参考实现，调用同一套验收；不会覆盖学员代码。
- `/playground?demo=network-inspector&source=mine`：把真实 read 的 bytes → decoded text → SSE data → 正文对应起来；原有四个单概念实验保留。
- `/profiler`：同一输入比较 M0–M4；“我的实现”加载 `src/my-chat/render-policy.ts`，与 Mini Chat 共用策略。它选择已有引擎策略，不测学员的 HTTP/SSE 解析耗时。

课程按 A 网络与协议 → B 可靠聊天 → C 渲染优化推进。浏览器、网络观察和 CLI 直接导入同一组学员函数。旧 `lesson` 独立习题保留作补充，不作为贯穿项目的验收。

```bash
pnpm dev:stream-render
pnpm --filter stream-render-lab practice test utf8
pnpm --filter stream-render-lab practice test
pnpm --filter stream-render-lab practice test --reference
```

`practice test` 检查当前学员代码，可限定 `utf8`、`sse`、`provider`、`lifecycle`、`batch`。起点能跑普通回答，但故意留有边界缺口，初始失败属于练习；修改对应文件再验收。页面按钮与 CLI 使用同一个断言集。工程 `test` 检查参考契约及装配，不能替代自己的 practice 验收。

教学端点 `/api/teaching?mode=stream` 不读取 Key、不调用模型、不根据输入生成答案。模式有 stream、split、buffered、truncated、error。服务端主动模拟缓冲或拆分；实际 reader.read 可能合并，不能据此推断 TCP 分段。验收另用固定切分与虚拟帧时钟复现边界，不是网络或绘制测速。

## DeepSeek live

公共站点只开放 deterministic replay。真实 API 只应在本地或受保护的 Preview 开启：

```bash
cp apps/stream-render-lab/.env.example apps/stream-render-lab/.env.local
# 设置 ENABLE_LIVE_API=1 与 DEEPSEEK_API_KEY
```

`VITE_COURSE_ORIGIN` 必须与课程站的公开 origin 一致；Course 侧的
`PUBLIC_LAB_ORIGIN` 必须指向本 Lab。两端会分别校验 `postMessage` 的目标与来源，部署时需要成对配置。

proxy 只承担协议白名单、模型白名单、密钥附加、abort 传播与原始 SSE byte passthrough。能力矩阵的唯一来源是 `api/capability-data.ts`；当前核验日期会随矩阵一起展示，不应把供应商限制散落在 UI 中。

`ENABLE_LIVE_API=1` 只是功能开关，**不是认证或访问控制**。部署到 Preview 时，必须在部署平台配置只有授权学习者能进入的访问保护；不能依赖这个环境变量阻止公网调用。proxy 会在读取过程中把请求体限制为 128 KiB，并额外限制单条与整段对话的 message content，但这些资源限制也不能替代认证。

## Bench 怎么读

`src/bench` 不用 wall-clock 判定算法复杂度。它用固定 seed 生成 8K、16K、32K、64K UTF-16 code units 的语料，并在同一个 `VirtualClock` 下固定：

- chunk：128 code units；
- ingest cadence：2 ms；
- display frame：16 ms；
- 指标：每次 preview 实际交给 parser 的 code units 总和；
- 终态 canonical parse 单独计量。

checkpoint-rich 语料应显示 M2 在规模翻倍时接近 4 倍工作量、M3 接近 2 倍。no-checkpoint 语料允许 M3 退化成 M2，但必须产生 `no_quiescent_checkpoint` diagnostic。真实 Chromium 报告用于解释用户体验，不作为跨机器 CI 的硬阈值。

## 工程文档

- [架构与不变量](docs/architecture.md)
- [协议矩阵](docs/protocol-matrix.md)
- [事故一：terminal 早于 visible drain](docs/incidents/drain-race.md)
- [事故二：Markdown 全局语义使稳定前缀失效](docs/incidents/global-markdown-invalidation.md)
- [事故三：过期 heavy result 覆盖新 revision](docs/incidents/stale-heavy-result.md)
- [Phase 2 高级实验](docs/phase-2-experiments.md)
- [第三方 renderer 隔离比较](docs/renderer-comparison.md)

## 项目边界

这里研究的是 Streaming Render，不实现 Agent Runtime、账号、持久化、附件或真实 Tool 执行。Phase 1 也不重写 CommonMark parser、不读取 micromark 私有状态、不发布 npm SDK；遇到无法证明局部等价的情况，优先正确 fallback，并把退化显式变成教学数据。
