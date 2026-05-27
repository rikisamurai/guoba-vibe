# QR 码编辑入口 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 给已存在但无入口的 `/admin/qrs/[id]/edit` 接上两处导航——后台卡片右上角的铅笔图标 + `/q/[id]` 上仅管理员可见的"编辑"按钮——同时保留 `/q/[id]` 的静态渲染。

**Architecture:** 后台入口纯重排 DOM（兄弟节点 `<Link>` 加图标）。详情页入口走"静态页面 + 客户端组件"模式：新增 `GET /api/admin-status` 端点，新增 `<AdminEditButton>` 客户端组件 mount 时去 fetch 状态，loading 和非管理员都返回 `null`，管理员才渲染按钮——这样 `/q/[id]` 不会因为读 session 而退化成动态渲染。

**Tech Stack:** Next.js 16.2.6 App Router、React 19 client component、better-auth、`lucide-react` v1（图标名带 `Icon` 后缀）、Vitest 4。

**Spec:** `docs/superpowers/specs/2026-05-27-qr-edit-entry-points-design.md`

---

## 文件结构

| 文件 | 动作 | 职责 |
|---|---|---|
| `apps/qr-codes/src/app/api/admin-status/route.ts` | 新建 | `GET` 返回 `{ isAdmin: boolean }`，`Cache-Control: no-store`，包裹 `getAdminSession()` |
| `apps/qr-codes/src/components/admin-edit-button.tsx` | 新建 | 客户端组件，mount 时 fetch `/api/admin-status`，仅管理员渲染编辑按钮 |
| `apps/qr-codes/src/app/q/[id]/page.tsx` | 改 | 在按钮行（Copy / Open / Download）后挂载 `<AdminEditButton qrId={id} />` |
| `apps/qr-codes/src/components/qr-card.tsx` | 改 | 外层包 relative，右上角放绝对定位的兄弟 `<Link>` + `PencilIcon` |

---

## Task 1: 新增 `/api/admin-status` 路由

**Files:**
- Create: `apps/qr-codes/src/app/api/admin-status/route.ts`

- [ ] **Step 1: 创建路由文件**

```ts
// apps/qr-codes/src/app/api/admin-status/route.ts
import { NextResponse } from "next/server";
import { getAdminSession } from "@/auth/admin";

export async function GET() {
  const session = await getAdminSession();
  return NextResponse.json(
    { isAdmin: session !== null },
    { headers: { "Cache-Control": "no-store" } },
  );
}
```

- [ ] **Step 2: 起 dev server 并 curl 未登录态**

在另一个 shell 中：

```bash
pnpm --filter qr-codes dev
```

等 dev server 起来（监听 :3000）后，在当前 shell：

```bash
curl -s http://localhost:3000/api/admin-status
```

Expected: `{"isAdmin":false}`

如果返回的不是这个 JSON，先排查再继续。

- [ ] **Step 3: 提交**

```bash
git add apps/qr-codes/src/app/api/admin-status/route.ts
git commit -m "feat(qr-codes): /api/admin-status route for client admin checks"
```

---

## Task 2: 新增 `<AdminEditButton>` 客户端组件

**Files:**
- Create: `apps/qr-codes/src/components/admin-edit-button.tsx`

- [ ] **Step 1: 创建组件**

```tsx
// apps/qr-codes/src/components/admin-edit-button.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function AdminEditButton({ qrId }: { qrId: string }) {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/admin-status", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { isAdmin: false }))
      .then((data) => {
        if (alive) setIsAdmin(Boolean(data.isAdmin));
      })
      .catch(() => {
        if (alive) setIsAdmin(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (!isAdmin) return null;

  return (
    <Button asChild size="sm" variant="outline">
      <Link href={`/admin/qrs/${qrId}/edit`}>编辑</Link>
    </Button>
  );
}
```

关键点：
- 初始状态 `null`，loading 和非管理员都返回 `null`（SSR 输出空，公开访客 HTML 不含管理员 DOM）
- `alive` flag 防止组件卸载后 `setState`
- fetch 失败默认非管理员

- [ ] **Step 2: typecheck**

```bash
pnpm --filter qr-codes build 2>&1 | tail -20
```

Expected: 无 TS 报错（build 可能因为 lint 等其他原因失败，只看 `admin-edit-button.tsx` 相关报错。如果只有"未被使用"这类警告，可以忽略，到 Task 3 挂载后会消失）。

- [ ] **Step 3: 提交**

```bash
git add apps/qr-codes/src/components/admin-edit-button.tsx
git commit -m "feat(qr-codes): AdminEditButton client component"
```

---

## Task 3: `/q/[id]` 挂载 `<AdminEditButton>`

**Files:**
- Modify: `apps/qr-codes/src/app/q/[id]/page.tsx`

- [ ] **Step 1: 在按钮行加 import 和组件**

打开 `apps/qr-codes/src/app/q/[id]/page.tsx`。

在现有 import 区追加（紧跟 `DownloadButtons` 那行）：

```tsx
import { AdminEditButton } from "@/components/admin-edit-button";
```

找到现有的按钮行（在 `src/app/q/[id]/page.tsx` 大约 89-99 行的 `<div className="flex gap-2 flex-wrap">` 块）。在 `<DownloadButtons id={row.id} title={row.title} />` 之后追加：

```tsx
<AdminEditButton qrId={row.id} />
```

修改后整段大致长这样：

```tsx
<div className="flex gap-2 flex-wrap">
  <CopyButton value={row.url} label="Copy URL" />
  {isSafeOpenScheme(row.url) && (
    <Button asChild size="sm">
      <a href={row.url} target="_blank" rel="noopener noreferrer">
        Open link
      </a>
    </Button>
  )}
  <DownloadButtons id={row.id} title={row.title} />
  <AdminEditButton qrId={row.id} />
</div>
```

- [ ] **Step 2: 未登录态验证（HTML 不含管理员 DOM）**

dev server 仍在运行的情况下：

```bash
curl -s http://localhost:3000/q/SOME_REAL_QR_ID | grep -i "编辑\|admin/qrs/.*/edit" || echo "OK: no admin DOM"
```

把 `SOME_REAL_QR_ID` 换成一个真实存在的 QR id（从 `/admin` 卡片 URL 里取即可——如果当前没有数据，可以先用任意已存在的 id，或者跳过这一步等 Task 5 一起 e2e 验）。

Expected: `OK: no admin DOM`

- [ ] **Step 3: 提交**

```bash
git add apps/qr-codes/src/app/q/[id]/page.tsx
git commit -m "feat(qr-codes): show Edit button on /q/[id] for admin"
```

---

## Task 4: 后台 QR 卡片右上角加铅笔图标

**Files:**
- Modify: `apps/qr-codes/src/components/qr-card.tsx`

- [ ] **Step 1: 重写 qr-card.tsx**

替换整个文件内容：

```tsx
// apps/qr-codes/src/components/qr-card.tsx
import Link from "next/link";
import { PencilIcon } from "lucide-react";
import { renderSvg } from "@/lib/qr";
import { QrCardLink } from "@/components/qr-card-link";

export async function QrCard({
  id,
  title,
  url,
  returnHref,
}: {
  id: string;
  title: string;
  url: string;
  returnHref?: string;
}) {
  const svg = await renderSvg(url, { width: 256, margin: 1 });
  return (
    <div className="relative">
      <QrCardLink
        id={id}
        href={`/q/${id}`}
        returnHref={returnHref}
        className="block rounded-lg border p-4 hover:shadow-md transition"
      >
        <div
          className="aspect-square w-full max-w-[180px] mx-auto [&_svg]:w-full [&_svg]:h-full"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <h3 className="mt-3 font-medium truncate pr-7">{title}</h3>
        <p className="mt-1 text-xs text-muted-foreground font-mono truncate">{url}</p>
      </QrCardLink>
      <Link
        href={`/admin/qrs/${id}/edit`}
        aria-label="编辑"
        title="编辑"
        className="absolute top-2 right-2 z-10 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <PencilIcon className="size-4" />
      </Link>
    </div>
  );
}
```

要点：
- 外层 `<div className="relative">` 改为定位容器（不是 link）
- 主链接区域保留 `<QrCardLink>`，行为不变
- 铅笔 `<Link>` 是兄弟节点，绝对定位 `top-2 right-2`，`z-10` 保证压在卡片之上
- 标题加 `pr-7` 给图标让出空间，避免长标题被图标遮挡
- `PencilIcon` 来自 `lucide-react`（v1 命名约定）

- [ ] **Step 2: typecheck + lint**

```bash
pnpm --filter qr-codes build 2>&1 | tail -20
```

Expected: 无 TS / lint 报错。

- [ ] **Step 3: 提交**

```bash
git add apps/qr-codes/src/components/qr-card.tsx
git commit -m "feat(qr-codes): pencil edit icon on admin QR cards"
```

---

## Task 5: 端到端本地验证

按项目 `AGENTS.md` 的 "Local verify > prod verify" 规则，用 `agent-browser` 在 `http://localhost:3000` 上跑一遍。如果上一步 dev server 还在跑就继续用；否则 `pnpm --filter qr-codes dev` 重启。

- [ ] **Step 1: 管理员登录态验证**

确保浏览器里 cookie 是管理员账号（如果没登录就走 `/login` 走完 GitHub OAuth）。

逐项验：

1. 访问 `/admin`：每张卡片右上角能看到铅笔图标，未挤压标题
2. 点铅笔：跳到 `/admin/qrs/<id>/edit`，表单 `title` / `description` / `url` / `collections` 都正确预填
3. 改 `title`（加个后缀），点 Save：跳回 `/q/<id>`，新标题可见
4. 在 `/q/<id>` 上能看到"编辑"按钮，点击同样进入预填好的编辑页
5. 浏览器 DevTools Network 里能看到 `/api/admin-status` 返回 `{"isAdmin":true}`

如有任意一项失败，回到对应 Task 调查再继续。

- [ ] **Step 2: 未登录态验证**

打开无痕窗口或先登出。

1. 访问 `/q/<id>`：看不到"编辑"按钮
2. View Source（或 `curl`），HTML 不含 `编辑` / `admin/qrs/...edit` 字样
3. `/api/admin-status` 在 DevTools 里返回 `{"isAdmin":false}`
4. 直接访问 `/admin/qrs/<id>/edit`：被 `requireAdmin()` 重定向到 `/login`

- [ ] **Step 3: 收尾**

- 把 dev server 停掉
- 如果验证过程中改过 title 这种"测试数据"，按 AGENTS.md 的要求改回来（local 写的是 prod Neon 库）
- 没有未提交修改的话直接进 Task 6；有的话先小步提交

---

## Task 6: 跑 react-doctor 复查

项目自带 `react-doctor` skill，按 `apps/qr-codes/AGENTS.md` "完成功能、提交前" 的指引跑一遍。

- [ ] **Step 1: 触发 react-doctor**

调用 skill: `react-doctor`（或在交互中输入 `/doctor`）。

按 skill 输出处理：如果只是已知的 false positive（项目里有 `react-doctor.config.json` 的 suppress 列表），跳过；如果是真实问题，回到对应 Task 修。

- [ ] **Step 2: 若有修改，commit**

```bash
git status
# 如果有修改：
git add -p
git commit -m "fix(qr-codes): <react-doctor 提出的具体问题>"
```

无修改则跳过。

---

## 自检（写完计划后我做的）

**Spec 覆盖度：**
- ✅ 后台卡片铅笔图标 → Task 4
- ✅ `/q/[id]` 仅管理员"编辑"按钮 → Task 2 + Task 3
- ✅ `/q/[id]` 保持静态 → Task 2 用客户端组件，不在 server 读 session（Task 3 Step 2 用 curl 验证）
- ✅ 公开访客无管理员 DOM → Task 5 Step 2
- ✅ 新增 `/api/admin-status` → Task 1
- ✅ 不动 `updateQr` / schema / 编辑页 → 计划里没有这些文件

**Placeholder 扫描：** 无 TBD / TODO / "implement later"。`SOME_REAL_QR_ID` 是占位，但上下文给了取值方法。

**类型一致性：** `AdminEditButton` 的 `qrId: string` 在 Task 2 定义、Task 3 使用一致。`PencilIcon` 在 Task 4 单一引用，命名 grounded（已在自检 spec 时验证过 `lucide-react` v1 命名约定）。

**风险点提醒：** Task 1 Step 2 假设 dev server 启动成功；如果端口被占用或环境变量缺失，先解决再继续。
