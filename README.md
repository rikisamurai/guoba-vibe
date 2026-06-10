# guoba-vibe

围绕「二维码 / 移动端 deep link」的实验性 monorepo，目前包含两个独立的前端应用，分别对应两种使用场景：服务端持久化的个人 vault，以及完全跑在浏览器里的本地 vault。

## 应用

| 路径                             | 简介                                                                      | 技术栈                                                                                                    |
| -------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| [`apps/qr-codes`](apps/qr-codes) | 单管理员、公开只读的 deep link QR vault，部署在 Vercel 上                 | Next.js 16 (App Router) · React 19 · Drizzle + Vercel Postgres · better-auth + GitHub OAuth · Tailwind v4 |
| [`apps/qr-vault`](apps/qr-vault) | 纯前端、本地优先的 QR / deep link 管理器，数据保存在浏览器 `localStorage` | React 19 · Vite 8 · TanStack Router (hash) · Tailwind v4                                                  |

两个应用互不依赖，可以独立开发、构建和部署。详细的功能说明、使用方式和约定见各自子目录下的 README / AGENTS。

## 环境要求

- Node.js `>= 24`（仓库根目录 `.nvmrc` 锁定到 24）
- pnpm `11.3.0`（仓库 `packageManager` 已声明，建议用 corepack 自动启用）

```bash
corepack enable
pnpm install
```

首次安装时会通过 `simple-git-hooks` 注册 pre-commit 钩子，提交前由 `lint-staged` + `oxfmt` 统一格式化暂存区文件。

## 常用脚本

根目录的 `package.json` 把两个应用的常用命令都做了 alias，按需选用。

### qr-codes（默认 `dev` / `build` / `start` 指向这里）

```bash
pnpm dev          # next dev
pnpm build        # next build
pnpm start        # next start
pnpm lint         # oxlint
pnpm test         # vitest run
```

### qr-vault

```bash
pnpm dev:qr-vault       # vite dev server，默认 http://localhost:5173
pnpm build:qr-vault     # tsc -b && vite build
pnpm preview:qr-vault   # vite preview
pnpm lint:qr-vault
pnpm test:qr-vault
```

### 仓库级

```bash
pnpm fmt          # oxfmt 全量格式化
pnpm fmt:check    # CI 检查
```

也可以直接使用 workspace filter，比如 `pnpm --filter qr-codes test -- url-parse` 只跑单个文件。

## 仓库布局

```
.
├── apps/
│   ├── qr-codes/   # Next.js 应用（服务端 + DB）
│   └── qr-vault/   # Vite 应用（纯前端 + localStorage）
├── docs/           # 跨应用文档
├── AGENTS.md       # 协作约定（CLAUDE.md 软链到此）
├── pnpm-workspace.yaml
└── package.json
```

## 协作约定

仓库根目录的 [`AGENTS.md`](AGENTS.md) 记录了与 AI agent 协作时的通用准则（思考再写、最小改动、对齐目标后再执行等），以及 `agent-browser` 在本仓库的会话复用约定。各应用目录下还有自己的 `AGENTS.md`，包含框架版本注意事项、TDD 流程和测试模板。
