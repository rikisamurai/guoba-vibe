# Mini Chat workshop

Quick Start 在 Course 中通过真实实验完成观察，不要求学习者修改代码。这里的可编辑 workshop 从 01 开始：它们是同一个 Mini Chat 的连续快照，不是互不相干的算法题；01–06 是当前正式路径，10 是提前开放的 M1 黄金样板。

- `exercise/` 是本课 starter：上一课完整 solution，加上本课唯一一个 TODO。
- `solution/` 是完成本课 TODO 后的快照，也是下一课 starter 的基线。
- `contract.ts` 会重跑之前所有能力，再验证本课新增能力。
- `fixture.ts` 是本课新增的、可重复的输入。

```bash
pnpm --filter stream-render-lab lesson 01 test
pnpm --filter stream-render-lab lesson 01 solution
```

把 `01` 替换为 `02` 到 `06`，或者预览 `10`。`test` 预期只有本课新增 contract 失败；`solution` 必须全部通过。
