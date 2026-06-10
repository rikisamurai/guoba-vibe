# ESLint → oxlint 全量迁移 — 设计

## 背景

仓库已经深度使用 OXC 生态：格式化是 `oxfmt`（`.oxfmtrc.json`），VS Code 装的是 `oxc.oxc-vscode`（一个扩展同时管 fmt 和 lint）。唯独 lint 还停在 ESLint。本次把 lint 也换成 `oxlint`，补上最后一块拼图。

当前 lint 现状（pnpm monorepo，两个 app）：

- `apps/qr-vault`（Vite + React，`eslint.config.js`）：`@eslint/js` recommended + `typescript-eslint` recommended + `eslint-plugin-react-hooks` + `eslint-plugin-react-refresh`（带自定义 `allowExportNames`）+ `max-lines:200`。
- `apps/qr-codes`（Next.js 16，`eslint.config.ts`）：`eslint-config-next`（core-web-vitals + typescript，经 `@eslint/compat` 的 `fixupConfigRules` 包裹）+ `max-lines:200`。
- 集成点：CI（`.github/workflows/lint.yml` 跑 `pnpm lint`）、根 `package.json` 的 lint-staged（先 `oxfmt --write` 再 `eslint --no-warn-ignored`）、simple-git-hooks 的 pre-commit。

源码里**没有任何** `eslint-disable` / `oxlint-disable` 内联指令（已 grep 确认），所以没有内联指令需要转换。

## 决策（已与 Riki 确认）

1. **全量替换**：两个 app 都只用 oxlint，彻底移除 ESLint 及其依赖。qr-codes 放弃 `eslint-config-next`，改用 oxlint 的 `nextjs` 插件。
2. **拥抱 oxlint 默认**：保留 oxlint 开箱默认（`correctness` 类别 + 默认插件 `eslint`/`typescript`/`unicorn`/`oxc`）并叠加 `react`（+ qr-codes 的 `nextjs`）。这比现有 ESLint 更严，首次在现有代码上跑预计会决出一批 unicorn/oxc 新发现 —— 逐条**修代码或精准关规则**，纳入本次迁移范围。

## 目标

- 两个 app 只用 `oxlint`，`pnpm lint`（CI 入口）保持绿。
- `max-lines:200` 行为逐字保留：`max:200` + `skipBlankLines` + `skipComments` + 测试文件豁免。
- `reportUnusedDisableDirectives` 的「过期 disable 指令自动报错」行为保留。
- 移除 ESLint 全部依赖；AGENTS.md §5 文档同步到 oxlint 语境。

## 非目标

- 不改 lint 之外的工具（oxfmt 不动、测试不动、CI 结构不动）。
- ~~不引入 type-aware（tsgolint）规则~~ —— 原迁移阶段的非目标；**后续按需求在同 PR 启用了 `typeAware` + `typeCheck`**（两 app config 的 `options`；qr-vault 为兼容 tsgo 去掉了 tsconfig 的 `baseUrl`、`paths` 改相对）。见 `feat(lint): enable oxlint type-aware` commit。
- 不做与 lint 无关的代码重构；代码改动仅限于「为通过 oxlint 默认规则」所必需的修复。

## 已核实的关键事实

- `max-lines` oxlint **完整支持** `max`/`skipBlankLines`/`skipComments`（自 v0.2.14，pedantic 类别）。在 `rules` 里直接给规则定 severity 即可启用，**无需**整类打开 pedantic。
- 默认插件集是 **`unicorn`/`typescript`/`oxc`**；**`eslint` 核心规则不需要在 `plugins` 里列**即可用。`plugins` 数组一旦显式写就**覆盖**默认集，需把想保留的（unicorn/oxc）连同新增的（react/nextjs）一起列全。
- 配置字段：`categories`、`rules`、`overrides`（含 `files` glob，后者覆盖前者）、`ignorePatterns`、`options.reportUnusedDisableDirectives`（**仅根配置文件生效**）。
- ⚠️ **`@oxlint/migrate` 默认产出「忠实迁移」**：它会把 `categories.correctness` **关掉**，只保留你 ESLint 原有规则。要落实「拥抱默认」必须在迁移后**手动重新打开** `correctness`（见迁移方法）。
- oxlint 兼容识别 `eslint-disable` / `eslint-disable-next-line` 注释，但首选 `oxlint-disable`。
- `react-refresh`/`react-hooks` 均归在 `react` 插件下；`nextjs` 插件源自 `@next/eslint-plugin-next`。

## 设计

### 1. `apps/qr-vault/.oxlintrc.json`

```jsonc
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["typescript", "unicorn", "oxc", "react"], // 默认集(unicorn/typescript/oxc) + react；eslint 核心规则无需在此列出
  "categories": { "correctness": "error" },
  "rules": {
    "react-refresh/only-export-components": ["error",
      { "allowConstantExport": true,
        "allowExportNames": ["badgeVariants", "buttonVariants", "router", "useSidebar"] }],
    "react-hooks/set-state-in-effect": "off"
  },
  "options": { "reportUnusedDisableDirectives": "error" },
  "ignorePatterns": ["dist", "src/components/shadcn-ui/**"],
  "overrides": [
    { "files": ["src/**/*.{ts,tsx}"],
      "rules": { "max-lines": ["error", { "max": 200, "skipBlankLines": true, "skipComments": true }] } },
    { "files": ["src/**/*.test.{ts,tsx}", "src/tests/**"],
      "rules": { "max-lines": "off" } }
  ]
}
```

### 2. `apps/qr-codes/.oxlintrc.json`

与上同构，差异：

- `plugins` 增加 `"nextjs"`。
- `ignorePatterns`：`[".next", "out", "build", "next-env.d.ts", "src/components/shadcn-ui/**"]`。
- max-lines override 的 `files` 用 `src/**/*.{js,jsx,ts,tsx}`，测试豁免用 `src/**/*.test.{js,jsx,ts,tsx}`（`tests/` 在 src 外，本就不被 src glob 命中）。

> 上面两份配置是「拥抱默认」的**目标态**（`correctness` 开、保留 unicorn/oxc、叠加 react/nextjs）。实际落地时先用 `@oxlint/migrate` 生成忠实基线（它会把 `correctness` 关掉），再手动改成此目标态——而非从零手写。`react`/`nextjs` 插件 migrate 会从 ESLint 配置自动映射，以工具产出为准、按此目标态收敛。

### 3. 集成改动

| 位置 | 改动 |
|---|---|
| `apps/qr-vault/package.json` | `"lint": "eslint ."` → `"lint": "oxlint"` |
| `apps/qr-codes/package.json` | `"lint": "eslint"` → `"lint": "oxlint"` |
| 两个 app 的 `package.json` | `devDependencies` 加 `oxlint` / `oxlint-tsgolint`；`lint` 脚本改为 `oxlint` |
| 根 lint-staged | 两个 app 的 `... exec eslint --no-warn-ignored` → `pnpm --filter <app> exec oxlint .`（整 app 跑，避免只暂存 ignored 文件时失败） |
| `.github/workflows/lint.yml` | 不改（仍 `pnpm lint`） |
| `.vscode/` | 扩展已装；如需显式开 lint 诊断再补设置（按实跑结果决定） |

### 4. 删除的依赖

- qr-vault：`eslint`、`@eslint/js`、`typescript-eslint`、`eslint-plugin-react-hooks`、`eslint-plugin-react-refresh`、`globals`。
- qr-codes：`eslint`、`eslint-config-next`、`@eslint/compat`。
- `pnpm-workspace.yaml` 里 `peerDependencyRules.allowedVersions.eslint: '10'` 一并删除。
- 删除两个旧 `eslint.config.*` 文件。

### 5. 文档同步（`AGENTS.md` §5，即 `CLAUDE.md` 软链目标）

- L74「ESLint enforces max 200 lines」→ oxlint。
- L88 逃生舱 `/* eslint-disable max-lines -- <reason> */` → `/* oxlint-disable max-lines */`；`-- reason` 后缀 oxlint 未文档化，**待验证**：支持则保留，不支持则把理由放相邻注释，并更新文中表述。
- L89「add it to `ignores` in that app's `eslint.config`」→ `ignorePatterns` in `.oxlintrc.json`。
- 「greppable」约定的 grep 目标从 `eslint-disable max-lines` 改为 `oxlint-disable max-lines`。

## 涉及文件

- `apps/qr-vault/.oxlintrc.json` — 新增
- `apps/qr-codes/.oxlintrc.json` — 新增
- `apps/qr-vault/eslint.config.js` — 删除
- `apps/qr-codes/eslint.config.ts` — 删除
- `apps/qr-vault/package.json`、`apps/qr-codes/package.json` — 改 lint 脚本、删依赖
- `package.json` — 改 lint-staged
- `pnpm-workspace.yaml` — 删 eslint peer 规则
- `AGENTS.md` — §5 文案同步
- `migrate-oxlint` skill — 一次性迁移辅助；最终已移除，不保留在 PR 目标态
- 可能的源码修复 — 为通过 oxlint 默认规则（数量待首次跑暴露）

## 迁移方法：官方 `migrate-oxlint` skill

采用 OXC 官方 skill 作为机械迁移引擎，本仓库已用 skills CLI（`skills-lock.json`），装法地道：

```bash
npx skills add https://github.com/oxc-project/oxc --skill migrate-oxlint
```

它本质是 `@oxlint/migrate` 的 agent 封装。关键用法与我们项目特有的叠加层：

- **逐 app 跑**（monorepo，skill 本身不覆盖此点）：在每个 app 目录跑 `npx @oxlint/migrate`，读各自 `eslint.config.*` 生成 `.oxlintrc.json`。
- 用 `npx @oxlint/migrate --details` 看哪些规则没迁成功 —— 这是量化 qr-codes 「nextjs 覆盖度 vs eslint-config-next」缺口的权威手段。
- **不**加 `@oxlint/migrate` 到依赖（一次性 npx）；**只**装 `oxlint`。
- `--replace-eslint-comments` 本项目用不上（源码无 disable 指令）。
- 多次跑会留 `.oxlintrc.json.bak`，完事删掉。

> skill 默认产出忠实迁移；「拥抱默认」是我们在其产物上手动加的（重开 `correctness`、保留 unicorn/oxc）。skill 管机械步骤，本 spec 管项目决策，二者叠加。

## 验证（实施顺序 = 风险消解顺序）

1. 装 `migrate-oxlint` skill → 逐 app 跑 `npx @oxlint/migrate`（+ `--details`）拿忠实基线。
2. 把两份生成配置改成第 1/2 节的目标态：**重新打开 `categories.correctness`**、确认保留 unicorn/oxc、补齐 react/nextjs 与 max-lines override、加 `options.reportUnusedDisableDirectives`。
3. 装 oxlint → 在**当前代码**上 `oxlint`：逐条 triage 新发现（unicorn/oxc/nextjs 等），决定「修代码」或「关规则」，收敛到绿。
4. 回归测试：临时塞一个 201 行源文件 + 一个未用变量 → 确认 oxlint 拦得住（证明 max-lines 与 correctness 生效），确认后回滚该临时文件。
5. 删 ESLint 依赖、改 scripts + lint-staged → `pnpm install` + `pnpm lint` 两个 app 全绿。
6. 验证 lint-staged：`git add` 一个改动文件，触发 pre-commit，确认 oxlint 步骤按预期跑且配置正确命中。
7. 更新 AGENTS.md §5；grep 全仓确认无残留 `eslint` 引用（`eslint.config`、`eslint-disable`、依赖名等）。

## 待验证项（实施第一步即可消解）

- oxlint 对传入文件路径的配置发现 + override 相对路径行为（决定 lint-staged 写法）。
- `react-refresh/only-export-components` 的 `allowExportNames` / `allowConstantExport` 选项支持。
- `oxlint-disable` 是否支持 `-- reason` 后缀（skill 只确认 `eslint-disable` 注释被识别，未提及 reason 语法）。
- `nextjs` 插件覆盖度 vs `eslint-config-next/core-web-vitals`（由 `@oxlint/migrate --details` 量化；缺口大则按需在 `rules` 里补 `nextjs/*` 规则）。
- `options.reportUnusedDisableDirectives` 在 per-app 配置（相对各自 app 是根）下是否生效。

## 风险

- **Next.js 规则覆盖回归**：放弃 `eslint-config-next` 后，oxlint 的 nextjs 插件可能漏掉少数 `@next/next` 规则。缓解：步骤 2 的 diff + 按需补规则；这是「全量替换」决策已接受的代价。
- **首次 triage 工作量不确定**：拥抱 oxlint 默认会带出 unicorn/oxc 新发现，数量到步骤 2 才知道。若过多，可对个别噪音规则 `"off"`，但默认倾向修代码。
- **lint-staged 配置命中**：oxlint 在 monorepo 下按传入路径发现 per-app 配置是关键假设，步骤 1/5 必须实证。
