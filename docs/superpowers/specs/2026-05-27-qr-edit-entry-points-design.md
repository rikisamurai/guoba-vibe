# QR 码编辑入口 — 设计

## 背景

编辑功能本身已经全部就绪：
- Server action `updateQr` 在 `src/server/qrs.ts:48`
- `QrForm` 组件原本就支持 `initial` prop
- 编辑页 `src/app/(admin)/admin/qrs/[id]/edit/page.tsx` 含表单和删除按钮，完全可用

**唯一的缺口**：UI 里没有任何链接指向这个页面，管理员只能手敲 URL `/admin/qrs/[id]/edit` 才能进入。本次改动只是把这个隐藏的页面"接上线"。

## 目标

- 管理员能在后台首页一键进入编辑页
- 管理员能从公开详情页 `/q/[id]` 进入编辑页
- 公开访客看不到任何管理员入口
- `/q/[id]` 保持静态渲染（不退化为动态）

## 非目标

- 不动 `updateQr`、不动 schema、不动编辑页本身
- 不做批量编辑、不做行内编辑

## 关键约束

`/q/[id]` 当前是静态渲染（`generateStaticParams() → []` + `revalidatePath` 触发再生）。如果直接在 server component 里 `getAdminSession()`，整页会变成每请求动态，公开访客也受影响——这是回归，必须避免。

## 设计

### 1. 后台 QR 卡片右上角加铅笔图标（`/admin`）

改造 `src/components/qr-card.tsx`：
- 外层 wrapper 设 `position: relative`
- 主区域仍是 `<QrCardLink>` 链接到 `/q/[id]`（行为不变）
- 右上角额外放一个绝对定位的 `<Link>`（**兄弟节点，不是嵌套**），指向 `/admin/qrs/[id]/edit`，渲染为图标按钮：`lucide-react` 的 `PencilIcon`（v1 命名约定，跟 `XIcon`/`CheckIcon` 一致），配 `aria-label="编辑"` 和 `title="编辑"`

兄弟定位保证 HTML 合法（无嵌套 `<a>`）。点图标进编辑页，点卡片其他地方仍进详情页。

### 2. `/q/[id]` 上加仅管理员可见的"编辑"按钮

为保持静态渲染，session 判断不能放在 server component 里。方案：

- 新增路由 `src/app/api/admin-status/route.ts`：`GET` 返回 `{ isAdmin: boolean }`，内部调用 `getAdminSession()`，响应 `Cache-Control: no-store`
- 新增客户端组件 `src/components/admin-edit-button.tsx`：挂载时 `fetch('/api/admin-status')`，loading 和非管理员都返回 `null`，管理员渲染一个 `<Button asChild>` 包 `<Link href="/admin/qrs/[id]/edit">编辑</Link>`
- 在 `src/app/q/[id]/page.tsx` 现有按钮行（Copy / Open / Download 那一行）里加 `<AdminEditButton qrId={id} />`

代价：管理员每次访问详情页多一次极轻 fetch；公开访客零成本，HTML 中也不会出现任何管理员相关 DOM。

## 涉及文件

- `src/components/qr-card.tsx` — 改结构，加铅笔图标
- `src/app/api/admin-status/route.ts` — 新增
- `src/components/admin-edit-button.tsx` — 新增（client）
- `src/app/q/[id]/page.tsx` — 挂载 `<AdminEditButton>`

## 验证

`pnpm dev` + agent-browser 跑 `http://localhost:3000`：

1. 管理员登录后：
   - `/admin` 每张卡右上角能看到铅笔图标
   - 点铅笔进入编辑页，表单正确预填
   - 修改后保存能跳回 `/q/[id]`，更新可见
   - `/q/[id]` 上能看到"编辑"按钮，点击同样进编辑页

2. 未登录或非管理员：
   - `/admin` 路径直接被 `requireAdmin()` 拦走，看不到卡片（既有行为）
   - `/q/[id]` 上看不到"编辑"按钮
   - 查看 `/q/[id]` 的 HTML 源码，不含任何管理员 DOM

## 风险

- 新增 `/api/admin-status` 端点要长期维护——但只是一个对 `getAdminSession()` 的极薄封装，可接受
- 卡片右上角铅笔图标可能在窄宽度下挤压标题——验证时确认
