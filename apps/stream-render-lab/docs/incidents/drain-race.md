# 事故分析：terminal 到了，最后一段却消失了

## 摘要

网络已经收到完整回答和 terminal event，但 UI 偶发少最后几个字符；另一些运行中，Promise 已 resolve 后又出现一次 React commit。两种现象来自同一个错误：把“source 结束”误当成“visible 已追上 raw”。

## 触发条件

M1 以后存在两只钟：

- ingest clock 持续把 delta 追加到 raw；
- display clock 在 frame 中把 visible cursor 向 raw 推进。

当 terminal event 恰好落在两个 display frame 之间，raw 已完整而 visible 仍有 backlog。如果此时直接 settled 或取消 frame，尾部会丢；如果先 settled、保留 frame，之后又会发生 late update。

## 失败时间线

```text
t=30  ingest "最后一段" → raw=完整，visible=旧值，frame@32 pending
t=31  provider terminal → 错误实现直接 phase=settled，settled.resolve()
t=32  分支 A：frame 被取消，最后一段永不可见
      分支 B：frame 继续，settled snapshot 之后 revision 又增长
```

用户能看到的症状是末尾缺字、复制内容不完整、screen reader 没收到最终段落，或测试中出现 “update after settled”。

## 根因

实现只有 `streaming/settled` 两态，没有表达 draining；同时把 transport terminal、visible 完成和 canonical parse 完成压成一个布尔值。测试使用真实 timer，竞态又难以稳定复现。

## 修复

1. terminal 只锁定 outcome，不立即发布 settled；
2. phase 进入 `draining`，排空所有已接受 raw；
3. 进入 `settling`，移除 preview repair 并 canonical full parse；
4. terminal heavy work 完成或被取消；
5. 发布唯一 `settled` snapshot，再 resolve `settled` Promise；
6. 清除 frame、timer、Worker 和所有 late listener。

取消也遵守同一条 raw 边界：已经接受的内容做安全终态渲染，尚未接受的 source 通过 AbortSignal 停止。

## 防回归不变量

```text
settled ⇒ visibleRaw === acceptedRaw
settled ⇒ canonicalParseCount === 1
settled ⇒ pendingClockTasks === 0
每个 run 恰好一个 outcome、一个 settled snapshot
```

用 VirtualClock 把 terminal 安排在 frame 前 1ms，分别覆盖 direct、smooth、cancel 和 transport break。断言 `settled` 前 backlog 可存在，`settled` 后 backlog 为零且再推进时钟不会更新 revision。

## 可观测性

Trace 至少记录 terminal internalSeq、drain 开始/结束时间、最大 backlog code units、最终 commit revision 和清理后的 pending task 数。这样“供应商少发了”与“renderer 少显示了”可以在一次复现中分开。
