# Phase 2 高级实验

Phase 2 不改变 `production` profile 的默认行为。每个实验先形成小 contract、确定性测试与明确 failover，再决定是否进入主引擎。

## Worker projection / highlighting

`src/worker` 让 inline 与 Worker adapter 跑同一套 contract。Worker session 预热后只发送 suffix；返回结果仍必须匹配 `(runId, blockId, revision)`。Worker 失败、abort 或 session 丢失时，从完整 raw 交给 inline adapter rebuild，不能继续相信 Worker 的局部缓存。

## Adaptive frame budget

`src/scheduler` 通过 `EngineClock` 驱动预算与取消。`scheduler.postTask` 和 `navigator.scheduling.isInputPending` 都被建模为可注入 capability；能力不存在时回退到 frame，不在测试里读取真实浏览器时钟。

## Property-based partitions

`src/fuzz` 固定 seed，对 UTF-8 byte split、SSE chunk split、provider wire event、Markdown prefix 与 VirtualClock ordering 生成分区。随机输入只是扩大搜索空间，oracle 仍是 canonical parse 与协议不变量。

## M3b definition dependency

`src/markdown/m3b.ts` 建立 effective definition → reference block 索引，生成 suffix 所需的 prefix definition context，并计算 definition 变化时的定向 invalidation。当前 `planM3bUpdate` 始终发布 M2 oracle，`safety` 固定为 `oracle-fallback`；只有 partition tests 能证明 candidate 等价后，才允许把 candidate 设为 accepted。

## 超长输出

`src/long-output` 同时提供两种实验：

- `ContentVisibilityBlock` 使用 `content-visibility: auto` 与估算 intrinsic size，不卸载 DOM；
- `planBlockWindow` 只保留 viewport + overscan，并用上下 spacer 保持滚动高度。

有活动文本选择或缺少可靠测量时，策略不会启用 windowing。窗口化能减少 DOM，但会破坏被卸载区域的选择、查找与辅助技术导航，因此不是默认生产策略。
