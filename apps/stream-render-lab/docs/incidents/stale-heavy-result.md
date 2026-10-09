# 事故分析：旧 Mermaid 结果覆盖了新代码块

## 摘要

用户正在接收 Mermaid diagram。revision 7 启动了一次异步 render；revision 8 很快修复了尚未闭合的语法并启动新任务。由于旧任务更慢，它最后返回并覆盖 revision 8，页面短暂或永久显示过期图形。Shiki Worker、KaTeX 与其他异步 transform 都可能发生同类事故。

## 失败时间线

```text
t=0   block A revision=7 → job J7 start
t=8   新 delta → block A revision=8 → job J8 start
t=20  J8 resolve → commit result R8
t=35  J7 resolve → 错误实现 commit result R7，覆盖新内容
```

只检查“组件还 mounted”无法防止它：同一个组件、同一个 block id 仍然存在，变化的是内容 revision。仅靠 debounce 也不够，已经启动的任务仍可能乱序完成。

## 根因

异步结果缺少归属证明，或者只以 `blockId` 为 cache key。另一个常见错误是闭包读取“当前 revision”，然后误以为结果来自当前 revision；闭包的 job input 与 commit 时状态没有被一起比较。

## 修复契约

每个 heavy job 捕获不可变 key：

```text
(runId, blockId, revision)
```

结果提交前同时验证：

1. run 仍是 active；
2. block 仍存在；
3. block 当前 revision 与 job revision 相同；
4. gate 没有 dispose/abort；
5. terminal policy 仍允许该类结果落地。

新 revision 到来时取消尚未开始的 debounce；可中止的 Worker/任务传播 AbortSignal。不能可靠中止的库允许继续计算，但结果必须被 revision guard 丢弃。

## last-good 策略

Mermaid/KaTeX 在 streaming 中常处于暂时非法状态。preview render 失败时保留同一 block 的 last-good 结果，并显示轻量 pending/error 状态；不能把错误输出记为新 last-good。终态 canonical raw 再执行一次受控任务，失败则以安全源码 fallback。

Shiki 的 work 指标使用累计 enqueue source growth。只把新增 code suffix 送入 tokenizer，稳定 token 与仍可能变化的 token 分开；如果 source 发生非 append 更新，则重建 tokenizer，而不是假装增量成立。

## 防回归测试

用 VirtualClock 和可控 Promise 构造 J8 先于 J7 resolve：

- 最终只允许 R8 commit；
- stale drop metric 增加一次；
- debounce window 内多次 revision 只启动预期 job 数；
- cancel/settled 后 resolve 不产生 snapshot 更新；
- `flush()` 等待当前有效 job，而不是所有已经失效的历史 job；
- dispose 后 pending timer、Worker 与 listener 均为零。

## 可观测性

Profiler 记录 heavy kind、key、queued/start/end/drop、debounce wait、duration 与 last-good hit。日志不保存 API key 或完整敏感内容；复现只需 block hash、长度、revision 和事件顺序。
