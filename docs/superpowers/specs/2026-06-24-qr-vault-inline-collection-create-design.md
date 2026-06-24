# QR Vault 编辑页内联创建 Collection 设计

**日期：** 2026-06-24  
**范围：** `apps/qr-vault`  
**状态：** 已确认设计，待实现计划

---

## 背景

QR 编辑页已经可以把当前 QR 分配到已有 Collection，但创建新 Collection 需要跳转到 Collections 管理页。这个跳转打断了当前 QR 的编辑流，尤其是在整理单个 QR 时，用户只需要快速补一个 Collection title 并立即勾选。

本次设计只补齐编辑页内的轻量创建能力，不改变 QR 保存语义，也不扩展 Collection 的完整管理能力。

## 目标

- 在 QR 编辑页的 Collections 区域直接创建新 Collection。
- 创建后自动选中新 Collection，并放在当前 chip 列表最后。
- Collection 创建立即写入 vault；当前 QR 的 Collection 归属仍由顶部 `Save` 保存。
- 支持复用 trim 后同名的已有 Collection，避免重复创建。
- 保持现有 i18n、视觉密度、黑白中性主题和 scan-safe 设计方向。

## 非目标

- 不在编辑页支持 Collection description。
- 不新增批量创建、搜索、重命名、删除或排序能力。
- 不自动保存当前 QR。
- 不改变 Collections 管理页的完整编辑能力。
- 不调整 QR preview、URL editor、storage schema 或路由结构。

## 用户交互

Collections 区域 header 继续显示标题、说明和 `Manage →`。在同一区域增加 `+ New` 快捷入口，用于展开内联创建行。

展开后，在 chip 列表上方显示：

- `Collection name` 输入框
- `Create` 按钮
- `Cancel` 按钮

交互规则：

- 输入值创建前只做 `trim()`。
- 重名判断大小写敏感：`Foo` 和 `foo` 是两个不同 Collection。
- `Enter` 创建。
- `Escape` 等同 `Cancel`，自动收起并清空输入框。
- 失焦不自动创建，避免误操作。
- `Cancel` 自动收起并清空输入框。
- 创建或复用成功后自动收起并清空输入框。
- trim 后为空时不创建，并在内联区域显示校验反馈。

空 Collection 状态下仍显示 `+ New`。现有空状态文案保留为辅助说明，不作为主要 CTA。

## 数据语义

创建新 Collection 时，Collection 本身立即写入 vault。这让新 Collection 在全局可见，并保持与 Collections 管理页一致的数据语义。

当前 QR 的关联不立即写入 vault。创建成功后，只把新 Collection id 追加到当前编辑页的 `collectionIds` 状态中。用户点击顶部 `Save` 后，`upsertQr()` 才把当前 QR 与所选 Collection 列表一起写入 `collectionItems`。

如果 trim 后的 title 与已有 Collection title 完全一致，则复用已有 Collection：

- 不创建新 Collection。
- 如果尚未选中，则追加到当前 `collectionIds`。
- 如果已经选中，则保持不变。

## 组件边界

`QrDetailPage` 负责数据写入和选择状态更新，因为它已经持有 `data`、`updateVault()` 和 `collectionIds`。

`QrDetailFormCard` 继续作为表单布局组件，接收创建回调并传给 Collections 区域，不直接操作 storage。

`CollectionPicker` 负责 chip 展示、勾选切换和内联创建输入交互。它不直接依赖 vault storage，只通过回调请求父级创建或复用 Collection。

建议新增回调形态：

```ts
type CreateCollectionResult = 'created' | 'selected-existing'

onCreateCollection?: (title: string) => CreateCollectionResult
```

实现时可以根据现有文件行数和职责拆分内联创建子组件，避免 `CollectionPicker` 超过 max-lines 或承担过多逻辑。

## 文案与 i18n

所有新文案跟随现有 i18n 资源，不在组件里硬编码。

建议新增键：

| key | en | zh-CN |
| --- | --- | --- |
| `collectionPicker.newCollection` | `+ New` | `+ 新建` |
| `collectionPicker.collectionName` | `Collection name` | `Collection 名称` |
| `collectionPicker.createCollection` | `Create` | `创建` |
| `collectionPicker.cancelCreate` | `Cancel` | `取消` |
| `collectionPicker.nameRequired` | `Collection name is required` | `请输入 Collection 名称` |
| `collectionPicker.createdAndSelected` | `Collection created and selected` | `已创建并选中 Collection` |
| `collectionPicker.existingSelected` | `Existing collection selected` | `已选中已有 Collection` |

## 视觉约束

- 保持 QR Vault 当前黑白中性主题，不引入绿色品牌感。
- 使用紧凑工具页布局，不做营销式 CTA。
- chip 列表保持当前 flex wrap，内联创建行放在 chip 列表上方。
- 新创建或复用的 Collection chip 出现在列表最后，并保持选中样式。
- 控件半径、边框、focus ring 和按钮风格沿用现有 shadcn/Tailwind 约定。

## 错误与反馈

- 空 title 使用内联校验，不弹 toast。
- 创建成功弹成功 toast。
- 复用已有 Collection 弹成功 toast，说明已选中已有项。
- QR URL 无效时，Collection 创建仍可执行；顶部 `Save` 是否可用继续由当前 URL 校验控制。

## 测试与验证

实现阶段需要覆盖：

- trim 后创建 Collection，保存 title 不含首尾空格。
- 大小写敏感复用：同名同大小写复用，不同大小写可新建。
- 创建后 chip 出现在列表最后并保持选中。
- 创建后不点击 `Save` 时，当前 QR 的 `collectionItems` 不新增关联。
- 点击 `Save` 后刷新详情页，关联仍保留。
- `Enter` 创建，`Escape` / `Cancel` 收起并清空。
- 空 title 显示内联错误且不创建。
- 英文和中文 i18n key 完整。
- Agent Browser 在真实编辑页验证展开、输入、创建、自动选中、保存后刷新仍保留。

## 影响文件预期

预计涉及：

- `apps/qr-vault/src/app/qr-detail-page.tsx`
- `apps/qr-vault/src/app/qr-detail/qr-detail-form-card.tsx`
- `apps/qr-vault/src/components/collection-picker.tsx`
- `apps/qr-vault/src/i18n/locales/en.json`
- `apps/qr-vault/src/i18n/locales/zh-CN.json`
- 可能新增一个 `apps/qr-vault/src/components/*` 子组件文件，用于保持组件职责和 max-lines。

## 开放问题

无。当前需求已固定为只创建 title、自动选中、自动收起清空、不自动保存 QR，并跟随现有 i18n。
