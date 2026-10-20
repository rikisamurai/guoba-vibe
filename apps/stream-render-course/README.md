# Streaming Render Course

面向有经验的前端开发者，用同一个 Mini Chat 学习 Streaming：真实网络 → 可靠交互 → 可验证优化。不复习 JavaScript 基础。

## 本地运行

仓库根目录执行 `pnpm install`、`pnpm dev:stream-render`。

- Course：http://localhost:5173/
- 我的 Mini Chat：http://localhost:5174/project?source=mine
- 真实网络观测：http://localhost:5174/playground?demo=network-inspector&source=mine
- 渲染策略实验：http://localhost:5174/profiler

默认固定回答，无需 Key。真实 HTTP 不根据 prompt 生成答案；页面验收使用固定字节切分与虚拟时钟，两者证据不同。

## 学习路径

- 00：确认自己的源码、参考与验收。
- A：07 HTTP → 04 UTF-8 → 05 SSE → 06 正文协议。
- B：08 生命周期 → 09 Markdown → 15 阅读交互 → 16 安全 → 18 项目验收。
- C：10 合帧 → 11 预览 → 12 稳定块 → 13 尾部解析 → 14 重型节点 → 17 测量。
- S1–S3：01–03 最小模型，按需补充，不是主线前置。

主线代码位于 Lab 的 `src/my-chat/`；浏览器与 `practice test` 加载同一组实现。starter 可运行，但故意缺少边界；不会把参考通过标成学员通过。渲染配置选择共享引擎策略，不宣称独立实现了解析器。

## 验证

```bash
pnpm --filter stream-render-lab practice test
pnpm --filter stream-render-lab practice test --reference
pnpm --filter stream-render-lab practice measure
pnpm --filter stream-render-course verify
pnpm --filter stream-render-course test:e2e
```

practice 支持 utf8、sse、provider、lifecycle、batch 单独验收；`practice measure` 在虚拟帧上测量学员 publish.ts 的发布次数与等待。初始自己的全量验收失败是学习任务；工程回归验证参考与现有运行结构，不要求课程自动替学员补完实现。

Course 不导入 Lab 引擎。Demo ID、preset 和 postMessage 校验由共享 contract 维护。部署配置 PUBLIC_LAB_ORIGIN 与 VITE_COURSE_ORIGIN 必须匹配实际源；本地不要混用 localhost 和 127.0.0.1。

UI 改动记录见 UI-CHANGES.md。

## 同源同步到 Obsidian

课程正文以 `docs/` 为唯一来源。提交课程相关改动后执行：

```bash
pnpm --filter stream-render-course sync:wiki --target /Users/shanyulong/riki/wiki/guoba-ai-wiki/agent-wiki/streaming-render-course
```

命令先确认课程、Lab、共享 contract 与依赖文件没有未提交改动，再重新构建 Markdown，导出 22 页课件、按 A/B/C 顺序组织的 README 和管理清单。每页保存源提交 SHA、提交日期与 GitHub 源文件链接；课内交互保留本地 5174 的实验入口。

`--target` 必须是 `.obsidian` 所在 vault 内的独立子目录。内部链接使用完整 vault 相对路径。增加 `--check` 会构建并比较结果，但不写 wiki；有差异时退出码为 1。

重复同步只更新或删除清单管理且内容未被手改的文件。已有同名文件、手工修改的生成课件或符号链接均会在写入前报冲突。个人笔记另建文件即可，不会被清理；如需改课程正文，请修改本仓库再同步。
