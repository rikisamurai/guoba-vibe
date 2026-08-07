# Mini Chat workshop

00 是使用真实生产 Engine 的观察型 Quick Start。01 起才是同一个 Mini Chat 的连续快照，不是互不相干的算法题；01–06 是当前正式路径，10 是提前开放的 M1 黄金样板。

- `00-quick-start/` 只让学习者把右侧 profile 从错误复用的 M0 换成 M4；fixture、Clock、Replay 和 contract 都可直接阅读。

- `exercise/` 是本课 starter：上一课完整 solution，加上本课唯一一个 TODO。
- `solution/` 是完成本课 TODO 后的快照，也是下一课 starter 的基线。
- `contract.ts` 会重跑之前所有能力，再验证本课新增能力。
- `fixture.ts` 是本课新增的、可重复的输入。

```bash
pnpm --filter stream-render-lab lesson 00 test
pnpm --filter stream-render-lab lesson 00 solution
pnpm --filter stream-render-lab lesson 01 test
pnpm --filter stream-render-lab lesson 01 solution
```

把 `00` 或 `01` 替换为 `02` 到 `06`，或者预览 `10`。`test` 预期只有本课新增 contract 失败；`solution` 必须全部通过。
