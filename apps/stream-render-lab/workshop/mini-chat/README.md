# Mini Chat workshop

这里是课程 S1–S3 补充练习的独立习题，不是主线。主线 A → B → C 直接修改 `src/my-chat/`，用 `pnpm --filter stream-render-lab practice test` 验收。

- `exercise/` 是本课 starter：上一课完整 solution，加上本课唯一一个 TODO。
- `solution/` 是完成本课 TODO 后的快照，也是下一课 starter 的基线。
- `contract.ts` 会重跑之前所有能力，再验证本课新增能力。
- `fixture.ts` 是本课新增的、可重复的输入。

```bash
pnpm --filter stream-render-lab lesson 01 test
pnpm --filter stream-render-lab lesson 01 solution
```

把 `01` 替换为 `02` 或 `03`。`test` 预期只有本课新增 contract 失败；`solution` 必须全部通过。课程内嵌实验也读取这里的 fixture 与 solution。
