# Guoba Skills

Guoba Skills 是一个面向 macOS 与仓库工作流的 Skill 管理器。它同时展示当前仓库的 Project Skills 和当前用户的 User Skills，并提供 Electron、TUI、CLI 与本地 Web UI 四种入口。

它只管理两套约定路径：`.agents/skills` 是唯一可写的规范副本，`.claude/skills` 是指向规范副本的 Claude 兼容投影。它不会扫描或改写其他 Agent 的目录。

## 安装

### macOS 应用

从 [GitHub Releases](https://github.com/rikisamurai/guoba-vibe/releases) 下载与 Mac 匹配的 DMG 或 ZIP：

- Apple Silicon 使用 `arm64`。
- Intel Mac 使用 `x64`。

版本标签产出的 Release 可能已签名并完成 notarization，取决于仓库是否配置了相应 secrets。Pull Request 的构建产物固定为未签名版本，适合评审和测试；首次打开时 macOS 可能要求在 Finder 或“系统设置 > 隐私与安全性”中确认。

### CLI / TUI

版本标签流水线会在配置 `NPM_TOKEN` 后发布到 npm；未配置时仍会生成可下载的 `.tgz`。开发期间可从仓库运行：

```bash
pnpm install --frozen-lockfile
pnpm --filter guoba-skills cli
```

发布到 npm 的版本可全局安装并直接使用 `guoba-skills`：

```bash
pnpm add --global guoba-skills
guoba-skills
```

无子命令的 `guoba-skills` 会在当前仓库打开 TUI。

## 使用方式

### Electron

打开应用并选择一个 Git 仓库。主视图会同时聚合：

- Project：所选仓库内的 Skills。
- User：当前用户主目录内的 Skills。

你可以查看 `SKILL.md`、文件列表、来源与 Claude 链接状态，检查单个或多个更新，并在实际写入前查看文件级和文本级 diff。Claude-only 目录会继续显示，但必须由你明确选择“设为规范副本”后才会迁移。

### TUI 与 CLI

Skill ID 固定为 `project:<folder>` 或 `user:<folder>`，例如 `project:grill-me`。

```bash
# 默认打开 TUI
guoba-skills

# 列表与机器可读输出
guoba-skills list
guoba-skills list --json

# 检查全部或单个 Skill
guoba-skills check
guoba-skills check project:grill-me

# 总是先打印 diff；不带 --yes 时不会写磁盘
guoba-skills update project:grill-me
guoba-skills update project:grill-me --yes

# 修复规范副本与 Claude 投影之间的链接
guoba-skills sync
guoba-skills sync user:grill-me

# 从 skills.sh 或 GitHub 安装
guoba-skills install https://skills.sh/example/skills/grill-me
guoba-skills install https://github.com/example/skills --scope user --skill grill-me --ref main
```

CLI 契约如下：

| 命令                                                                               | 作用                               |
| ---------------------------------------------------------------------------------- | ---------------------------------- |
| `guoba-skills`                                                                     | 在当前仓库打开 TUI                 |
| `guoba-skills list [--json]`                                                       | 列出 Project 与 User Skills        |
| `guoba-skills check [id]`                                                          | 检查全部或指定 Skill 的上游状态    |
| `guoba-skills update <id> [--yes]`                                                 | 打印 diff；只有 `--yes` 才执行写入 |
| `guoba-skills sync [id]`                                                           | 检查并修复安全的 Claude symlink    |
| `guoba-skills install <source> [--scope project\|user] [--skill slug] [--ref ref]` | 安装 skills.sh 或 GitHub 来源      |
| `guoba-skills ui [--port 4178] [--no-open]`                                        | 启动本地 Web UI                    |

### 本地 Web UI

```bash
guoba-skills ui
guoba-skills ui --port 4178 --no-open
```

Web UI 只监听本机，并与 Electron/TUI 使用同一套扫描、检查、diff 和更新规则。`--no-open` 可禁止自动打开浏览器。Guoba Skills 不包含托管后端、账号系统或云同步。

## 路径模型

| Scope   | 规范副本                         | Claude 投影                      | 来源锁文件                   |
| ------- | -------------------------------- | -------------------------------- | ---------------------------- |
| Project | `<repo>/.agents/skills/<folder>` | `<repo>/.claude/skills/<folder>` | `<repo>/skills-lock.json`    |
| User    | `~/.agents/skills/<folder>`      | `~/.claude/skills/<folder>`      | `~/.agents/skills-lock.json` |

每个 Claude 投影应是指向对应 `.agents/skills/<folder>` 的 symlink。Guoba Skills 不会用 symlink 覆盖真实的 Claude 目录，也不会改写指向其他位置的 symlink；这类冲突会保持原样并显示为需要人工处理。

开发和自动化场景可使用以下环境变量覆盖默认定位：

- `GUOBA_SKILLS_PROJECT_ROOT`：指定 Project 根目录。
- `GUOBA_SKILLS_HOME`：指定 User home 根目录。

## skills.sh 与 Git 更新语义

skills.sh 在这里是发现入口，不是文件托管或更新 API。安装 skills.sh URL 时，Guoba Skills 会解析其 GitHub 仓库和 Skill 子目录，然后通过系统 Git 获取实际内容。直接提供 GitHub 仓库也走相同流程。

`skills-lock.json` 记录来源类型、来源 URL、ref/branch、Skill 子路径、远端 revision、子目录 tree/content hash，以及安装和检查时间。检查更新时会先解析远端 revision，再比较实际 Skill 子目录；因此 monorepo 中其他目录的提交不会被误报为这个 Skill 的内容更新。

更新遵循固定顺序：

1. 获取候选版本并计算目标 Skill 子目录的内容差异。
2. 向调用方展示文件级和文本级 diff。
3. 获得明确确认后，原子替换 `.agents/skills/<folder>`。
4. 更新锁文件并在安全时重建对应的 Claude symlink。
5. 任一步骤失败都恢复更新前的规范目录。

本地修改不会与上游自动合并。检测到本地修改或分叉时，Guoba Skills 允许查看上游 diff，但会拒绝覆盖；请先备份、提交或还原本地改动，再重新准备更新。

## 安全与私有仓库

- Git 操作复用系统 `git`、SSH 配置和 credential helper，不保存独立账号或 token。
- Git 命令禁用交互式凭据提示；认证不可用时会返回明确错误，而不是挂起 UI。
- 不要把 token 写进 source URL；Guoba Skills 会直接拒绝这类 URL，避免凭据进入 lock、日志、shell 历史和进程列表。
- 所有写入都限定在选定 scope 的 `.agents/skills`、对应安全 symlink 和 `skills-lock.json`。
- Pull Request 构建产物未签名；只应从可信 PR 与 workflow run 下载。

## 开发

仓库要求 Node.js 24+ 与 pnpm 11.3.0。

```bash
# 安装依赖
pnpm install --frozen-lockfile

# TUI / CLI
pnpm --filter guoba-skills cli

# Electron 与 Web 开发服务器
pnpm --filter guoba-skills dev
pnpm --filter guoba-skills dev:web

# 构建
pnpm --filter guoba-skills build
pnpm --filter guoba-skills build:desktop
pnpm --filter guoba-skills build:cli
pnpm --filter guoba-skills build:web

# 静态检查与单元测试
pnpm --filter guoba-skills lint
pnpm --filter guoba-skills typecheck
pnpm --filter guoba-skills test

# Playwright
pnpm --filter guoba-skills exec playwright install --with-deps chromium
pnpm --filter guoba-skills test:e2e:web
pnpm --filter guoba-skills test:e2e:electron

# macOS DMG + ZIP（必须在 macOS 运行）
pnpm --filter guoba-skills package:mac
```

CI 在 Ubuntu 执行格式、lint、typecheck、单元测试和 Web E2E，并打包可安装的 CLI tarball；原生 arm64/x64 macOS runner 执行 Electron E2E 与打包。版本标签 `v<package-version>` 会生成同时包含 arm64/x64 DMG 与 ZIP 的 GitHub Release；配置 `NPM_TOKEN` 时同一流水线也会发布 CLI npm 包。

Release 在未配置凭据时生成未签名产物。要启用签名，需同时配置仓库 secrets `MAC_CSC_LINK` 与 `MAC_CSC_KEY_PASSWORD`；要继续执行 Apple notarization，还需同时配置 `APPLE_ID`、`APPLE_APP_SPECIFIC_PASSWORD` 与 `APPLE_TEAM_ID`。只配置一部分凭据会直接让发布失败，避免误发与预期不符的产物。
