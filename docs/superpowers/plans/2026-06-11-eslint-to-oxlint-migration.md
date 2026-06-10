# ESLint → oxlint 全量迁移 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把两个 app（qr-vault、qr-codes）的 lint 从 ESLint 全量换成 oxlint，行为对齐并拥抱 oxlint 默认规则集。

**Architecture:** 用官方 `migrate-oxlint` skill（即 `@oxlint/migrate`）逐 app 生成忠实基线配置，再手动改成「拥抱默认」目标态（重开 `correctness` + 保留 unicorn/oxc + 叠加 react/nextjs），triage 新发现到绿，最后切脚本/删依赖/同步文档。

**Tech Stack:** pnpm workspace、oxlint（`.oxlintrc.json`）、oxfmt（已在用，不动）、simple-git-hooks + lint-staged、GitHub Actions。

**Spec:** `docs/superpowers/specs/2026-06-11-eslint-to-oxlint-migration-design.md`

**当前已就绪（勿重做）:**
- 分支 `lint/migrate-to-oxlint` 已建并 checkout。
- 官方 `migrate-oxlint` skill 已装并 commit（`skills-lock.json` + `.agents/skills/migrate-oxlint/`）。
- spec 已 commit。

**目标态配置（本计划的事实来源）** — 两个 app 最终的 `.oxlintrc.json` 应分别等于 Task 2 / Task 3 中给出的完整内容。

---

## File Structure

| 文件 | 责任 | 动作 |
|---|---|---|
| `apps/qr-vault/.oxlintrc.json` | qr-vault lint 配置 | 新增 |
| `apps/qr-codes/.oxlintrc.json` | qr-codes lint 配置 | 新增 |
| `apps/qr-vault/eslint.config.js` | 旧 ESLint 配置 | 删除 |
| `apps/qr-codes/eslint.config.ts` | 旧 ESLint 配置 | 删除 |
| `apps/qr-vault/package.json` | lint 脚本 + 依赖 | 改 |
| `apps/qr-codes/package.json` | lint 脚本 + 依赖 | 改 |
| `package.json`（根） | lint-staged | 改 |
| `pnpm-workspace.yaml` | eslint peer 规则 | 改 |
| `AGENTS.md` | §5 文案 | 改 |

---

## Task 1: 生成忠实基线配置（`@oxlint/migrate`）

**Files:**
- Create（自动生成）: `apps/qr-vault/.oxlintrc.json`, `apps/qr-codes/.oxlintrc.json`

- [ ] **Step 1: qr-vault 跑迁移工具**

```bash
cd apps/qr-vault && npx -y @oxlint/migrate --details ; cd ../..
```

Expected: 生成 `apps/qr-vault/.oxlintrc.json`；`--details` 列出未能映射的规则（记下来，供 Task 4 参考）。

- [ ] **Step 2: qr-codes 跑迁移工具**

```bash
cd apps/qr-codes && npx -y @oxlint/migrate --details ; cd ../..
```

Expected: 生成 `apps/qr-codes/.oxlintrc.json`；`--details` 输出里关注 `eslint-config-next` / `@next/next` 哪些规则没映射（量化 nextjs 覆盖缺口）。

- [ ] **Step 3: 看一眼两份产物**

```bash
cat apps/qr-vault/.oxlintrc.json apps/qr-codes/.oxlintrc.json
```

Expected: 两份 JSON 存在；注意工具应已把 `categories.correctness` 设为 `off`（忠实迁移特征）。这是基线，下一步覆写成目标态。**不在此提交**（先成型再一起提交）。

---

## Task 2: 成型 qr-vault 配置 + 装 oxlint + 跑通

**Files:**
- Modify: `apps/qr-vault/.oxlintrc.json`（覆写为目标态）
- Modify: `apps/qr-vault/package.json`（加 oxlint 依赖）

- [ ] **Step 1: 装 oxlint 到 qr-vault**（mirror 旧 eslint 的 per-app 放置）

```bash
pnpm --filter qr-vault add -D oxlint
```

Expected: `apps/qr-vault/package.json` 的 devDependencies 出现 `oxlint`。

- [ ] **Step 2: 确认关键规则名真实存在**

```bash
pnpm --filter qr-vault exec oxlint --rules | grep -E "max-lines|only-export-components|set-state-in-effect"
```

Expected: 三个规则名都能 grep 到（确认 `react-refresh/only-export-components`、`react-hooks/set-state-in-effect`、`max-lines` 在本版 oxlint 的确切命名）。若命名不同，以此输出为准调整下一步配置。

- [ ] **Step 3: 覆写 `apps/qr-vault/.oxlintrc.json` 为目标态**

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["typescript", "unicorn", "oxc", "react"],
  "categories": { "correctness": "error" },
  "rules": {
    "react-refresh/only-export-components": [
      "error",
      {
        "allowConstantExport": true,
        "allowExportNames": ["badgeVariants", "buttonVariants", "router", "useSidebar"]
      }
    ],
    "react-hooks/set-state-in-effect": "off"
  },
  "options": { "reportUnusedDisableDirectives": "error" },
  "ignorePatterns": ["dist", "src/components/shadcn-ui/**"],
  "overrides": [
    {
      "files": ["src/**/*.{ts,tsx}"],
      "rules": {
        "max-lines": ["error", { "max": 200, "skipBlankLines": true, "skipComments": true }]
      }
    },
    {
      "files": ["src/**/*.test.{ts,tsx}", "src/tests/**"],
      "rules": { "max-lines": "off" }
    }
  ]
}
```

- [ ] **Step 4: 跑 oxlint（这步是「测试」）**

```bash
pnpm --filter qr-vault lint 2>/dev/null || pnpm --filter qr-vault exec oxlint
```

Expected: oxlint 执行成功（exit 0，或仅报出 Task 4 要 triage 的 unicorn/oxc 新发现）。**若报 schema/字段错误**（例如 `options` 不被接受）：把 `options` 块删掉，改在脚本里用 `oxlint --report-unused-disable-directives-severity error`，记录到 Task 6。

---

## Task 3: 成型 qr-codes 配置 + 跑通

**Files:**
- Modify: `apps/qr-codes/.oxlintrc.json`（覆写为目标态）
- Modify: `apps/qr-codes/package.json`（加 oxlint 依赖）

- [ ] **Step 1: 装 oxlint 到 qr-codes**

```bash
pnpm --filter qr-codes add -D oxlint
```

Expected: `apps/qr-codes/package.json` devDependencies 出现 `oxlint`。

- [ ] **Step 2: 确认 nextjs 插件规则可用**

```bash
pnpm --filter qr-codes exec oxlint --rules | grep -iE "nextjs|next/" | head
```

Expected: 列出一批 `nextjs/...` 规则（确认插件存在且规则名前缀）。

- [ ] **Step 3: 覆写 `apps/qr-codes/.oxlintrc.json` 为目标态**

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["typescript", "unicorn", "oxc", "react", "nextjs"],
  "categories": { "correctness": "error" },
  "options": { "reportUnusedDisableDirectives": "error" },
  "ignorePatterns": [".next", "out", "build", "next-env.d.ts", "src/components/shadcn-ui/**"],
  "overrides": [
    {
      "files": ["src/**/*.{js,jsx,ts,tsx}"],
      "rules": {
        "max-lines": ["error", { "max": 200, "skipBlankLines": true, "skipComments": true }]
      }
    },
    {
      "files": ["src/**/*.test.{js,jsx,ts,tsx}"],
      "rules": { "max-lines": "off" }
    }
  ]
}
```

- [ ] **Step 4: 跑 oxlint（「测试」）**

```bash
pnpm --filter qr-codes exec oxlint
```

Expected: 执行成功（exit 0 或仅 Task 4 要 triage 的新发现）。同 Task 2 Step 4 的 `options` 兜底处理。

---

## Task 4: Triage「拥抱默认」新发现到全绿

**Files:**
- Modify: 受影响的源文件（数量由实跑暴露），和/或两份 `.oxlintrc.json`（精准关噪音规则）

- [ ] **Step 1: 全量跑，收集所有新发现**

```bash
pnpm --filter qr-vault exec oxlint ; pnpm --filter qr-codes exec oxlint
```

Expected: 列出 correctness/unicorn/oxc/nextjs 报的问题清单。

- [ ] **Step 2: 逐条决策（默认修代码）**

对每条发现二选一：
- **真问题** → 改源码修掉（遵守 surgical changes，只改报错处）。
- **明确噪音/与项目风格冲突的规则** → 在对应 app 的 `.oxlintrc.json` 的 `rules` 里设 `"<plugin>/<rule>": "off"`，并在该行加注释说明为何关。

> 准则：拥抱默认 = 倾向修代码；只有规则本身不合理才关。

- [ ] **Step 3: 复跑直到全绿（「测试」）**

```bash
pnpm --filter qr-vault exec oxlint && pnpm --filter qr-codes exec oxlint && echo "BOTH GREEN"
```

Expected: 打印 `BOTH GREEN`（两个 exit 0）。

- [ ] **Step 4: 若 triage 改了源码，早跑 build + test 兜底**

> **记下 Task 4 改动了哪些源文件/路由** —— Task 9 的浏览器冒烟按此缩放。若 Step 2 一行源码都没改（纯靠关规则收敛），跳过本步。

```bash
pnpm test ; pnpm test:qr-vault          # 两个 app 的 vitest
pnpm build:qr-vault                      # tsc -b + vite build，含类型检查
```

Expected: 测试全过；qr-vault build 成功。（qr-codes 的 `next build` 需 `.env.local`，放到 Task 9 统一做。）证明 triage 的源码改动没破坏编译/逻辑。

- [ ] **Step 5: 提交配置 + triage 改动**

```bash
git add apps/qr-vault/.oxlintrc.json apps/qr-codes/.oxlintrc.json apps/qr-vault/package.json apps/qr-codes/package.json apps/qr-vault/src apps/qr-codes/src
git commit -m "feat(lint): add oxlint configs and triage findings"
```

Expected: commit 成功（pre-commit hook 此时仍跑旧 eslint，应也能过；若 hook 因尚未切脚本而报错，先继续，Task 6 会修正）。

---

## Task 5: 回归验证 max-lines 与 correctness 真的拦得住

**Files:**
- 临时文件（用完即删，不提交）

- [ ] **Step 1: 造一个 201 行源文件 + 一个未用变量**

```bash
{ echo "const x = 1"; for i in $(seq 1 205); do echo "// line $i"; done; } > apps/qr-vault/src/__lint_probe__.ts
```

注：`skipComments:true` 会跳过注释行，所以纯注释撑不爆 max-lines。改用真实代码行验证：

```bash
{ for i in $(seq 1 205); do echo "export const v$i = $i"; done; } > apps/qr-vault/src/__lint_probe__.ts
```

- [ ] **Step 2: 跑 oxlint，确认被拦（「测试」）**

```bash
pnpm --filter qr-vault exec oxlint src/__lint_probe__.ts ; echo "exit=$?"
```

Expected: 报 `max-lines`（文件 205 行代码 > 200）；`exit=1`。证明 max-lines + skipComments 生效。

- [ ] **Step 3: 删除探针文件**

```bash
rm apps/qr-vault/src/__lint_probe__.ts
```

Expected: 文件删除；`git status` 不含该文件。**本 Task 无 commit。**

---

## Task 6: 切 lint 脚本、删 ESLint 依赖与旧配置

**Files:**
- Modify: `apps/qr-vault/package.json`, `apps/qr-codes/package.json`（lint 脚本 + 删依赖）
- Delete: `apps/qr-vault/eslint.config.js`, `apps/qr-codes/eslint.config.ts`
- Modify: `pnpm-workspace.yaml`

- [ ] **Step 1: 改两个 app 的 lint 脚本**

`apps/qr-vault/package.json`: `"lint": "eslint ."` → `"lint": "oxlint"`
`apps/qr-codes/package.json`: `"lint": "eslint"` → `"lint": "oxlint"`

（若 Task 2 Step 4 走了 `options` 兜底，则改为 `"lint": "oxlint --report-unused-disable-directives-severity error"`。）

- [ ] **Step 2: 删 ESLint 依赖**

```bash
pnpm --filter qr-vault remove eslint @eslint/js typescript-eslint eslint-plugin-react-hooks eslint-plugin-react-refresh globals
pnpm --filter qr-codes remove eslint eslint-config-next @eslint/compat
```

Expected: 两个 app 的 package.json 不再含上述包；`pnpm-lock.yaml` 更新。

- [ ] **Step 3: 删旧 ESLint 配置文件**

```bash
git rm apps/qr-vault/eslint.config.js apps/qr-codes/eslint.config.ts
```

- [ ] **Step 4: 删 workspace 的 eslint peer 规则**

`pnpm-workspace.yaml` 删除这三行：

```yaml
peerDependencyRules:
  allowedVersions:
    eslint: '10'
```

- [ ] **Step 5: 重装 + 跑 CI 入口（「测试」）**

```bash
pnpm install && pnpm lint && echo "PNPM LINT GREEN"
```

Expected: 打印 `PNPM LINT GREEN`（`pnpm lint` = qr-codes + qr-vault 串跑，均 oxlint，exit 0）。

- [ ] **Step 6: 提交**

```bash
git add apps/qr-vault/package.json apps/qr-codes/package.json pnpm-workspace.yaml pnpm-lock.yaml
git commit -m "build(lint): switch lint scripts to oxlint, drop eslint deps"
```

---

## Task 7: 切 lint-staged + 验证 pre-commit hook

**Files:**
- Modify: `package.json`（根，lint-staged 块）

- [ ] **Step 1: 把 lint-staged 的两条 eslint 步骤换成 oxlint**

根 `package.json` 的 `lint-staged`，两个 app 数组里：
`"pnpm --filter qr-codes exec eslint --no-warn-ignored"` → `"pnpm --filter qr-codes exec oxlint"`
`"pnpm --filter qr-vault exec eslint --no-warn-ignored"` → `"pnpm --filter qr-vault exec oxlint"`

（`oxfmt --write` 那条与第三条全局 oxfmt 不动。）

- [ ] **Step 2: 验证 hook 命中（「测试」）**

```bash
echo "export const probe = 1" >> apps/qr-vault/src/main.tsx
git add apps/qr-vault/src/main.tsx
pnpm exec lint-staged
```

Expected: lint-staged 对 qr-vault 跑 oxfmt + oxlint 且通过；oxlint 能从传入文件路径正确发现 `apps/qr-vault/.oxlintrc.json`。**若 oxlint 对显式传入的 ignore 文件报警/报错**：在该步加 oxlint 的忽略兜底（验证 `--help` 找对应 flag），或把命令改为 `bash -c 'cd apps/qr-vault && oxlint'` 形式（忽略文件列表、整 app 跑，oxlint 够快）。

- [ ] **Step 3: 还原探针改动**

```bash
git restore --staged apps/qr-vault/src/main.tsx && git checkout -- apps/qr-vault/src/main.tsx
```

- [ ] **Step 4: 提交 lint-staged 改动**

```bash
git add package.json
git commit -m "build(lint): run oxlint in lint-staged pre-commit"
```

---

## Task 8: 同步 AGENTS.md §5 文档 + 清查残留

**Files:**
- Modify: `AGENTS.md`（§5，软链 `CLAUDE.md` 同步生效）

- [ ] **Step 1: 改 §5 四处表述**

- L74「ESLint enforces **max 200 lines** ...」→ 把 ESLint 改成 oxlint。
- L88 逃生舱：`/* eslint-disable max-lines -- <reason> */` → `/* oxlint-disable max-lines */`。先验证 reason 后缀是否支持：

```bash
printf '/* oxlint-disable max-lines -- test reason */\nexport const a = 1\n' > apps/qr-vault/src/__probe2__.ts
pnpm --filter qr-vault exec oxlint src/__probe2__.ts ; echo "exit=$?"
rm apps/qr-vault/src/__probe2__.ts
```

  支持（exit 0、无解析报错）→ 文档保留 `-- <reason>` 写法；不支持 → 文档改为「`/* oxlint-disable max-lines */` 紧邻一行 `// reason: <why>`」，并相应改措辞。

- L89「add it to `ignores` in that app's `eslint.config`」→ 「add it to `ignorePatterns` in that app's `.oxlintrc.json`」。
- 「both greppable」处的 grep 目标 `eslint-disable max-lines` → `oxlint-disable max-lines`。

- [ ] **Step 2: 清查全仓 ESLint 残留（「测试」）**

```bash
echo "--- config/dep 残留（应为空）---"
grep -rn "eslint" apps/*/package.json package.json pnpm-workspace.yaml 2>/dev/null || echo "✓ none"
echo "--- 残留 eslint.config 文件（应为空）---"
ls apps/*/eslint.config.* 2>/dev/null || echo "✓ none"
echo "--- 源码内 eslint-disable（应为空）---"
grep -rn "eslint-disable" apps/*/src 2>/dev/null || echo "✓ none"
```

Expected: 三项均为 `✓ none`（docs/ 与 .agents/ 里出现 eslint 字样属正常，不在清查范围）。

- [ ] **Step 3: 提交文档**

```bash
git add AGENTS.md
git commit -m "docs(lint): update file-size guide for oxlint"
```

> 文档提交后**不直接开 PR**——先过 Task 9 的 build/test/浏览器关卡。

---

## Task 9: 全量运行时验证（build / test / 浏览器）+ 开 PR

> **为什么需要这一关：** Task 4 的 triage 会改前端源码，按 AGENTS.md「UI/源码改动用 `pnpm dev` + agent-browser 在 localhost 验证」必须实跑确认没引入运行时回归——lint 绿 ≠ app 还能跑。本 Task **按 Task 4 实际改动缩放**。

**Files:** 无改动（验证 + PR）。agent-browser 见 `agent-browser` skill。

- [ ] **Step 1: 全量 build（类型 + 打包）**

```bash
pnpm build:qr-vault   # tsc -b + vite build
pnpm build            # qr-codes next build（需 apps/qr-codes/.env.local，本地已有）
```

Expected: 两个 app build 成功。证明删依赖 + triage 改动没破坏编译。

- [ ] **Step 2: 全量 test**

```bash
pnpm test && pnpm test:qr-vault
```

Expected: 两个 app 的 vitest 全过。

- [ ] **Step 3: 浏览器冒烟（agent-browser，guoba session）—— 按 Task 4 缩放**

起 dev（两个终端 / 后台）：

```bash
pnpm dev            # qr-codes → http://localhost:3000
pnpm dev:qr-vault   # qr-vault → http://localhost:5173（Vite，确认实际端口）
```

用 agent-browser 验证（**每条命令带 `AGENT_BROWSER_SESSION_NAME=guoba` 前缀**，见 AGENTS.md）：

- **必查**：两个 app 主界面能渲染、控制台无新增报错（各截一张图）。
- **重点缩放**：Task 4 改过源码的路由逐个 smoke——
  - 改了 `qr-card` / `qr-form` / `(admin)` 下组件 → 走 `/admin` 列表 + 编辑页（OAuth 由 guoba session cookie 自动过）。
  - 改了 `/q/[id]` / `/c/[id]` / `opengraph` → 走对应公开页。
  - 改了 qr-vault 组件 → 走其主界面对应交互。
- **若 Task 4 零源码改动**（纯靠关规则收敛）→ 退化为最小冒烟：两个首页各一张截图确认无白屏即可。

Expected: 相关路由正常渲染、交互可用、无新报错。发现回归 → 回到 Task 4 修。

- [ ] **Step 4: 关 dev server，推分支开 PR**

```bash
git push -u origin lint/migrate-to-oxlint
gh pr create --fill --base main
```

Expected: PR 创建；`.github/workflows/lint.yml` 在 PR 上跑 `pnpm lint` 并通过（终极验证）。

---

## Self-Review（写计划后自查）

- **Spec coverage:** spec 的「设计 1–5 / 验证 1–7 / 待验证项」均有对应 Task：配置(2,3)、集成脚本(6,7)、删依赖(6)、文档(8)、CI(9 Step4)、回归(5)、triage(4)、各待验证项内联在 Task 2/3/7/8 的「若…则…」分支里。✓
- **运行时验证（Riki 补充）:** Task 4 triage 触碰源码 → Task 9 用 build + test + agent-browser（guoba session）按改动缩放验证，并在 Task 4 Step 4 加了早期 build/test 兜底。开 PR 前置于运行时验证之后。✓
- **Placeholder scan:** 无 TBD/TODO；config 内容完整给出；triage 的「数量未知」是迁移本质（用实跑命令暴露），非占位。✓
- **一致性:** 两份配置的 `max-lines` 选项、测试豁免 glob、`plugins` 命名跨 Task 一致；脚本名 `lint` 全程不变（CI 无需改）。✓
