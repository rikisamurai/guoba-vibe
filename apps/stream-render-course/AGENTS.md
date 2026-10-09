# Streaming Render Course

Rspress 课程站只负责教学内容和嵌入式 Demo 外壳，不得导入 Lab 引擎源码。

- Demo ID、preset 和消息协议统一来自 `@stream-render/contract`。
- 教程必须包含可运行练习、测试命令、失败现象、实现步骤和边界，不写成同构模板。
- 组件放在 `components/`，不要放进 `docs/` 形成意外路由。
- 保留 Rspress 原主题，只通过 re-export、tokens 和小组件扩展；不要 eject 整套主题。
- 可见布局变化仍需先取得 Riki 的视觉批准。
- 完成改动后运行 `pnpm --filter stream-render-course verify`。
