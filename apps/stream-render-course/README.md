# Streaming Render Course

面向会基本 JavaScript 的新手：观察 → 小练习 → 网络 → 可靠交互 → 渲染优化 → 完整项目。

## 本地运行

从仓库根目录运行 `pnpm install`、`pnpm dev:stream-render`。

- Course：http://localhost:5173/
- Playground：http://localhost:5174/playground
- 完整教学 Mini Chat：http://localhost:5174/project
- 工程实验台：http://localhost:5174/lab

默认固定回答，无需 Key。/project 使用真实本地 HTTP，不根据 prompt 生成答案。

## 学习路径

00 体验；01–03 最小显示；04–07 网络；08–10 可靠性与调度；11–14 渲染进阶；15–18 交互、安全、性能与项目。

01–06、10 提供 exercise / solution；其他课是可运行的源码实验与项目步骤，不伪装成独立 TODO。首次学习可在 10 后先完成 15、16、18，再深入性能。环境与预备知识见 /setup、/basics。

## 验证

```bash
pnpm --filter stream-render-course verify
pnpm --filter stream-render-course test:e2e
pnpm --filter stream-render-lab test
```

Course 不导入 Lab 引擎。Demo ID、preset 和 postMessage 校验由共享 contract 维护。部署配置 PUBLIC_LAB_ORIGIN 与 VITE_COURSE_ORIGIN 必须匹配实际源；本地不要混用 localhost 和 127.0.0.1。

UI 改动记录见 UI-CHANGES.md。
