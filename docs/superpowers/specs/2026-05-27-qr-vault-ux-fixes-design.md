# QR Vault UX 优化设计文档

**日期：** 2026-05-27  
**范围：** apps/qr-vault  
**来源：** agent-browser 全流程验证后发现的 7 个问题

---

## 问题 & 修复方案

### 1. Import 后统计数字不刷新

**根因：** `mergeImport()` 先调 `updateVault()`（内部 `setData`），立即再调 `reloadVault()`（再次 `setData(loadVault())`）。React 18 自动批处理下，`localStorage.setItem` 可能在 `reloadVault` 读取时还未完成，导致读回旧数据覆盖新状态。

**修复：** 删除 `import-export-page.tsx` 中 `mergeImport` / `replaceImport` 里多余的 `reloadVault()` 调用。`updateVault` 已经通过函数式 `setData` 更新状态，无需二次 reload。

---

### 2. Save to local 继承原标题 → 同名 QR

**根因：** `share-page.tsx` 直接把 URL query 中的 `title` 传给 `upsertQr`，跳转到编辑页但 title 字段无聚焦提示。

**修复（方案 A）：** 保存逻辑不变，跳转到 `/q/$qrId` 后，`qr-detail-page.tsx` 检测到 `isNew`（无 `updatedAt` 或通过路由 state 传递 `autoFocusTitle: true`），将 title input 自动聚焦，并设置 placeholder `"给这个 QR 起个名字"`。用路由 state 而非 query param 传递信号，不污染 URL。

---

### 3. "Links" 标签含义不清

**根因：** `import-export-page.tsx` 硬编码 `"links"`，实际含义是 QR 与合集的关联记录（`collectionItems`）。

**修复：** 把标签改为 `"assignments"`（英文保持一致），计数同样读 `data.collectionItems.length`。

---

### 4. Collections 页编辑表单与 QR 列表视觉割裂

**根因：** 编辑表单和 QR 列表是平级的 grid 兄弟节点，无共同视觉容器或标题桥接。选中合集时，用户不清楚右侧 QR 列表属于当前合集。

**修复：** 选中合集时，给右侧 `list-panel` 加一个明确的子标题 `"属于「{collectionName}」的 QR"`（无合集选中时维持原 "All QR codes"）。不改变网格结构，只加标题文字来建立视觉关联。

---

### 5. 选中 QR 无高亮样式

**根因：** `workspace-page.tsx` 中 QR 行 `<button className="qr-row">` 从不加 `selected` class。

**修复：** 按钮 className 改为 `` `qr-row${qr.id === selectedQr?.id ? " qr-row--selected" : ""}` ``，并在 CSS 中添加 `.qr-row--selected` 样式（背景色高亮 + 左侧 accent border）。

---

### 6. 空 Vault 右栏 "No preview" 无引导

**根因：** `workspace-page.tsx` 的空状态只渲染 `<div className="panel empty-state">No preview</div>`，无任何操作引导。

**修复：** 替换为带 CTA 的空状态组件：
```
暂无 QR
[+ 新建 QR]  ← Link to /new
```
搜索无结果时显示 `"没有匹配的 QR"`，不显示 CTA。

---

### 7. 无"未分类"过滤入口

**根因：** `workspace-page.tsx` 侧栏只有"All QR"和各合集入口，无法过滤出没有加入任何合集的 QR。

**修复：**
1. `vault.ts` 新增 `getUncategorizedQrs(data)` helper：返回 `id` 不在任何 `collectionItems.qrId` 中的 QR。
2. 侧栏"All QR"下方加"未分类"入口，点击时 `setFilterCollection("__uncategorized__")`，QR 列表走 `getUncategorizedQrs`。
3. 未分类数量为 0 时不显示该入口（避免无意义占位）。

---

## 文件变更清单

| 文件 | 变更内容 |
|------|---------|
| `import-export-page.tsx` | 删 `reloadVault()` × 2；改 "links" → "assignments" |
| `share-page.tsx` | 跳转时传 `state: { autoFocusTitle: true }` |
| `qr-detail-page.tsx` | 读 router state，`autoFocusTitle` 时 `useEffect` 聚焦 title input |
| `workspace-page.tsx` | qr-row 加 selected class；空状态加 CTA；侧栏加"未分类"入口 |
| `collections-page.tsx` | list-panel 加合集名标题 |
| `vault.ts` | 新增 `getUncategorizedQrs` |
| `app.css` / 样式文件 | 新增 `.qr-row--selected` 样式 |

## 不在本次范围内

- Collection 页面网格布局重构（只加标题，不动 CSS grid）
- Export 流程（export 本身验证通过）
- qr-codes（Next.js app）任何改动
