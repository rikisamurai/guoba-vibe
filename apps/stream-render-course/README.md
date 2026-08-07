# Streaming Render Course

Rspress 教程站。课程通过 `@stream-render/contract` 与 Lab 的 `/embed/:demoId` 通信，不导入 Lab 引擎源码。

```bash
pnpm --filter stream-render-course dev
pnpm --filter stream-render-course validate
pnpm --filter stream-render-course test
pnpm --filter stream-render-course build
```

开发默认使用 `http://localhost:5174` 的 Lab。部署前通过 `PUBLIC_LAB_ORIGIN` 设置受信任的 Lab origin；`LessonDemo` 会同时校验 `message.origin`、`message.source`、协议版本和 `demoId`。

当前连续课程：

- `00`：用真实 Engine、VirtualClock 与 ReplaySource 观察 M0 / M4 的共同终点与 commit 差异。
- `01–03`：非流式 Mini Chat → 可控 Replay → M0 raw / visible。
- `04–06`：任意 UTF-8 byte split → WHATWG SSE → Chat Completions adapter。
- `10`：提前开放的 M1 frame batching 黄金样板；正式路径仍先完成 07–09。

```bash
pnpm --filter stream-render-lab lesson 00 test
pnpm --filter stream-render-lab lesson 00 solution
pnpm --filter stream-render-lab lesson 10 test
pnpm --filter stream-render-lab lesson 10 solution
```

`pnpm dev:stream-render` 会先检查 `5173 / 5174`。若旧 worktree 的 dev server 仍占端口，脚本会明确失败，避免浏览器继续展示旧站却被误认为新 Course。
