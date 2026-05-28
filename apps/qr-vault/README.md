# QR Vault

QR Vault 是一个本地优先的二维码/深链管理工具，用来保存、编辑、预览和分享常用 URL 或 deep link。应用是纯前端实现，数据默认保存在当前浏览器的 `localStorage` 里，不依赖服务端。

## 技术栈

- React 19 + TypeScript
- Vite 8，使用 `@vitejs/plugin-react`
- TanStack React Router，使用 hash history 组织路由
- Tailwind CSS v4 + shadcn/radix-nova 风格组件
- Radix UI、lucide-react 图标
- `qrcode` 在浏览器端生成二维码图片
- Vitest 做工具函数单测

## 功能

- 保存 QR 条目：支持标题、描述、完整 URL。
- 结构化编辑 deep link：可以直接改完整 URL，也可以拆成 scheme、path、query params 来编辑。
- 即时预览二维码：有效 URL 会在页面右侧生成二维码和解析结果。
- 搜索和筛选：可以按标题、URL、path、query key/value 搜索，并按 collection 快速过滤。
- Collection 管理：创建/编辑 collection，并把一个 QR 分配到一个或多个 collection。
- 分享页：生成 `#/share?...` 链接，别人打开后可以查看二维码、复制 URL，或保存到自己的本地 vault。
- 导入导出：把整个 vault 导出为 JSON，也可以从 JSON 文件 merge 或 replace 本地数据。
- 首次打开会写入一份 demo 数据，方便直接体验。

## 本地开发

在仓库根目录运行：

```bash
pnpm install
pnpm dev:qr-vault
```

也可以直接使用 workspace filter：

```bash
pnpm --filter qr-vault dev
```

Vite 默认会使用 `http://localhost:5173/`。如果端口被占用，会自动切到下一个端口；本次实际启动时使用的是 `http://localhost:5174/`。

常用命令：

```bash
pnpm test:qr-vault
pnpm build:qr-vault
pnpm preview:qr-vault
```

## 使用方式

1. 打开首页 `Vault`，可以浏览 demo QR、搜索、按 collection 筛选，或在顶部快速输入 URL 后进入编辑器。
2. 点击 `New QR` 创建新条目，填写标题、描述和 deep link；URL 可以整段粘贴，也可以在 scheme/path/query 表单里拆分编辑。
3. 保存后回到详情页，可以复制原始 URL、复制分享链接，或继续编辑 collection 归属。
4. 在 `Collections` 页面创建和编辑分组，并查看某个 collection 下的 QR。
5. 在 `Import` 页面导出 `qr-vault-export.json` 做备份；导入时可以选择 merge 到本地，或 replace 当前本地数据。
6. 分享链接是 hash URL，不会上传数据；对方打开分享页后可以直接查看二维码，也可以保存到自己的浏览器本地 vault。

## 数据说明

本地数据存储在浏览器 `localStorage` 的 `qr-vault:data` key 下。清理浏览器站点数据会删除本地 vault；需要迁移或备份时，请先在 `Import` 页面导出 JSON。
