# guoba-vibe

围绕「二维码 / 移动端 deep link / 移动端组件 / 私人工具」的实验性 monorepo，目前包含五个独立应用。

## 应用

| 路径                                       | 简介                                                                        | 技术栈                                                                                                    |
| ------------------------------------------ | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| [`apps/qr-codes`](apps/qr-codes)           | 单管理员、公开只读的 deep link QR vault，部署在 Vercel 上                   | Next.js 16 (App Router) · React 19 · Drizzle + Vercel Postgres · better-auth + GitHub OAuth · Tailwind v4 |
| [`apps/qr-vault`](apps/qr-vault)           | 纯前端、本地优先的 QR / deep link 管理器，数据保存在浏览器 `localStorage`   | React 19 · Vite 8 · TanStack Router (hash) · Tailwind v4                                                  |
| [`apps/rn-components`](apps/rn-components) | React Native 组件库，提供 web Storybook、Expo 原生 Storybook 和组件回归测试 | React Native 0.81 · Expo SDK 54 · Storybook 10 · Vitest                                                   |
| [`apps/guoba-stream`](apps/guoba-stream)   | 私有移动端优先的 X/Twitter 视频与 GIF 解析下载工具                          | React 19 · Vite 8 · Vercel Functions · invite-code access                                                 |
| [`apps/api-diff-lab`](apps/api-diff-lab)   | 本地 JSON API 合约取证工作台，识别破坏性变化与待人工确认的未观测结构        | React 19 · Vite 8 · Vitest                                                                                |

五个应用互不依赖，可以独立开发、构建和部署。详细的功能说明、使用方式和约定见各自子目录下的 README / AGENTS。

## 环境要求

- Node.js `>= 24`（仓库根目录 `.nvmrc` 锁定到 24）
- pnpm `11.3.0`（仓库 `packageManager` 已声明）

```bash
pnpm install
```

首次安装时会通过 `simple-git-hooks` 注册 pre-commit 钩子，提交前由 `lint-staged` + `oxfmt` 统一格式化暂存区文件。

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

### api-diff-lab

```bash
cd apps/api-diff-lab
pnpm dev       # Vite dev server
pnpm test      # Vitest
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
│   ├── api-diff-lab/ # JSON API 合约差异工作台
│   ├── guoba-stream/ # Vite + Vercel Functions 私有视频下载工具
│   └── rn-components/ # React Native 组件库 + Storybook
├── docs/           # 跨应用文档
├── AGENTS.md       # 协作约定（CLAUDE.md 软链到此）
├── pnpm-workspace.yaml
└── package.json
```

## 协作约定

仓库根目录的 [`AGENTS.md`](AGENTS.md) 记录了与 AI agent 协作时的通用准则（思考再写、最小改动、对齐目标后再执行等），以及 `agent-browser` 在本仓库的会话复用约定。部分应用目录下还有自己的 `AGENTS.md`，包含框架版本注意事项、TDD 流程和测试模板。
