# Streaming Render Course

Rspress 教程站。课程通过 `@stream-render/contract` 与 Lab 的 `/embed/:demoId` 通信，不导入 Lab 引擎源码。

```bash
pnpm --filter stream-render-course dev
pnpm --filter stream-render-course validate
pnpm --filter stream-render-course test
pnpm --filter stream-render-course build
```

开发默认使用 `http://localhost:5174` 的 Lab。部署前通过 `PUBLIC_LAB_ORIGIN` 设置受信任的 Lab origin；`LessonDemo` 会同时校验 `message.origin`、`message.source`、协议版本和 `demoId`。

当前黄金课程：

- `01-quick-start`：同 trace 的 M0 / M4 A/B。
- `05-sse`：真实 bytes 到 WHATWG SSE event。
- `10-m1-frame-batching`：VirtualClock、frame cap 与 terminal drain。
