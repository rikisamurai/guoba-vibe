# guoba-vibe

围绕前端工程实验与个人工具的 monorepo。目前包含六个应用，其中 Streaming Render Course / Lab 组成一套从网络字节到 React commit 的交互课程。

## 应用

| 路径                                                     | 简介                                                                        | 技术栈                                                                                                    |
| -------------------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| [`apps/qr-codes`](apps/qr-codes)                         | 单管理员、公开只读的 deep link QR vault，部署在 Vercel 上                   | Next.js 16 (App Router) · React 19 · Drizzle + Vercel Postgres · better-auth + GitHub OAuth · Tailwind v4 |
| [`apps/qr-vault`](apps/qr-vault)                         | 纯前端、本地优先的 QR / deep link 管理器，数据保存在浏览器 `localStorage`   | React 19 · Vite 8 · TanStack Router (hash) · Tailwind v4                                                  |
| [`apps/rn-components`](apps/rn-components)               | React Native 组件库，提供 web Storybook、Expo 原生 Storybook 和组件回归测试 | React Native 0.81 · Expo SDK 54 · Storybook 10 · Vitest                                                   |
| [`apps/guoba-stream`](apps/guoba-stream)                 | 私有移动端优先的 X/Twitter 视频与 GIF 解析下载工具                          | React 19 · Vite 8 · Vercel Functions · invite-code access                                                 |
| [`apps/stream-render-course`](apps/stream-render-course) | 面向前端开发者的 Streaming Render 交互课程                                  | Rspress 2 · MDX · React 19                                                                                |
| [`apps/stream-render-lab`](apps/stream-render-lab)       | 字节/SSE、渲染策略、Profiler 与 DeepSeek Chat 实验台                        | React 19 · Vite 8 · Vitest · Playwright                                                                   |

应用可以独立开发、构建和部署；Course 与 Lab 只通过 `@stream-render/contract` 中的 iframe manifest / `postMessage` 协议协作，不相互导入源码。详细约定见各自目录。

## 环境要求

- Node.js `>= 24`（仓库根目录 `.nvmrc` 锁定到 24）
- pnpm `11.3.0`（仓库 `packageManager` 已声明）

```bash
pnpm install
```

首次安装时会通过 `simple-git-hooks` 注册 pre-commit 钩子，提交前由 `lint-staged` + `oxfmt` 统一格式化暂存区文件。

## Streaming Render Course V2

同时启动教程与实验台：

```bash
pnpm dev:stream-render
```

- Course：`http://localhost:5173`
- Lab：`http://localhost:5174`

也可以分别启动：

```bash
pnpm --filter stream-render-course dev
pnpm --filter stream-render-lab dev
```

自定义端口时只需设置 `STREAM_RENDER_COURSE_PORT` 和 `STREAM_RENDER_LAB_PORT`；根启动脚本会同步配置 Course/Lab 的互信 origin，避免 iframe 仍指向默认端口。

00 先用真实生产引擎对照 M0 / M4；第一轮课程再让同一个 Mini Chat 连续完成非流式基线、可控 Replay、M0、UTF-8、SSE 与 Chat Completions adapter。后一课直接建立在前一课结果上；每课只有一个新失败、一个 TODO、一组共享 contract test：

```bash
pnpm --filter stream-render-lab lesson 00 test
pnpm --filter stream-render-lab lesson 01 test
pnpm --filter stream-render-lab lesson 04 test
pnpm --filter stream-render-lab lesson 06 test

# 对照参考实现
pnpm --filter stream-render-lab lesson 00 solution
pnpm --filter stream-render-lab lesson 01 solution
pnpm --filter stream-render-lab lesson 04 solution
pnpm --filter stream-render-lab lesson 06 solution
```

真实 DeepSeek Chat 只在本地明确启用。密钥保存在 gitignored 的 `apps/stream-render-lab/.env.local`，不会进入客户端 bundle：

```dotenv
ENABLE_LIVE_API=1
DEEPSEEK_API_KEY=your-local-key
VITE_COURSE_ORIGIN=http://localhost:5173
```

Course 侧用 `PUBLIC_LAB_ORIGIN` 指向可信 Lab；Lab 侧用 `VITE_COURSE_ORIGIN`
指定唯一可接收 embed report 的课程站。部署时两个 origin 必须成对配置。

课程、引擎和浏览器验证：

```bash
pnpm --filter stream-render-course verify
pnpm --filter stream-render-course test:e2e
pnpm --filter stream-render-lab test
pnpm --filter stream-render-lab build
pnpm --filter stream-render-lab test:e2e
```

## 常用脚本

根目录只保留仓库级脚本。应用开发命令进入对应 app 目录后运行。

### qr-codes

```bash
cd apps/qr-codes
pnpm dev          # next dev
pnpm build        # next build
pnpm start        # next start
pnpm lint         # oxlint
pnpm test         # vitest run
```

### qr-vault

```bash
cd apps/qr-vault
pnpm dev       # vite dev server，默认 http://localhost:5173
pnpm build     # tsc -b && vite build
pnpm preview   # vite preview
pnpm lint
pnpm test
```

### rn-components

```bash
cd apps/rn-components
pnpm dev:web          # web Storybook，默认 http://localhost:6006
pnpm run:ios          # iOS Simulator development build，首次编译较久
pnpm run:ios-device   # iOS 真机 development build，需 Xcode signing
pnpm run:android      # Android development build
pnpm start:ios        # 已安装 dev build 后启动 Metro + iOS
pnpm start:android    # 已安装 dev build 后启动 Metro + Android
pnpm test             # Vitest 组件回归测试
pnpm build            # TypeScript no-emit 校验
pnpm lint
```

### guoba-stream

```bash
cd apps/guoba-stream
pnpm dev       # Vite + 本地 /api bridge，默认 http://localhost:5173
pnpm test      # Vitest
pnpm test:e2e  # Playwright desktop + mobile
pnpm lint
pnpm build
```

### 仓库级

```bash
pnpm fmt          # oxfmt 全量格式化
pnpm fmt:check    # CI 检查
```

## 仓库布局

```
.
├── apps/
│   ├── qr-codes/   # Next.js 应用（服务端 + DB）
│   ├── qr-vault/   # Vite 应用（纯前端 + localStorage）
│   ├── guoba-stream/ # Vite + Vercel Functions 私有视频下载工具
│   ├── stream-render-course/ # Rspress 交互课程
│   ├── stream-render-lab/ # Streaming Render 实验、Profiler 与 Chat
│   └── rn-components/ # React Native 组件库 + Storybook
├── packages/
│   └── stream-render-contract/ # Course ↔ Lab 的内部 embed contract
├── docs/           # 跨应用文档
├── AGENTS.md       # 协作约定（CLAUDE.md 软链到此）
├── pnpm-workspace.yaml
└── package.json
```

## 协作约定

仓库根目录的 [`AGENTS.md`](AGENTS.md) 记录了与 AI agent 协作时的通用准则（思考再写、最小改动、对齐目标后再执行等），以及 `agent-browser` 在本仓库的会话复用约定。部分应用目录下还有自己的 `AGENTS.md`，包含框架版本注意事项、TDD 流程和测试模板。
