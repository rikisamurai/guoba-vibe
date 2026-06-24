# QR Vault Inline Collection Create Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an inline Collection title creation flow to the QR edit page that creates or reuses a Collection, auto-selects it in the current edit state, and preserves the existing top-level Save semantics for QR membership.

**Architecture:** Keep vault mutation in the QR detail page layer through a small QR-detail hook, keep the form card as layout, and keep `CollectionPicker` responsible for chips plus the inline input UI. Add a focused pure resolver so trim and case-sensitive duplicate behavior is covered by unit tests without coupling tests to React UI internals.

**Tech Stack:** Vite, React 19, TanStack Router, react-i18next, sonner, Tailwind v4, shadcn primitives, Vitest, Agent Browser.

---

## File Structure

- Create `apps/qr-vault/src/app/qr-detail/inline-collection-create.ts`: pure title resolver plus `useInlineCollectionCreate()` hook that writes Collections and appends selected ids.
- Create `apps/qr-vault/src/app/qr-detail/collections-section.tsx`: Collections header, `Manage →`, `New` trigger, and open/close state for the inline create row.
- Modify `apps/qr-vault/src/app/qr-detail-page.tsx`: wire the hook into the existing detail page and pass `onCreateCollection` to `QrDetailFormCard`.
- Modify `apps/qr-vault/src/app/qr-detail/qr-detail-form-card.tsx`: replace the inline Collections section markup with `CollectionsSection`.
- Modify `apps/qr-vault/src/components/collection-picker.tsx`: render the inline create row when requested and keep chip selection behavior unchanged.
- Modify `apps/qr-vault/src/i18n/locales/en.json` and `apps/qr-vault/src/i18n/locales/zh-CN.json`: add synchronized keys.
- Create `apps/qr-vault/src/tests/inline-collection-create.test.ts`: lock trim and case-sensitive duplicate rules.

---

### Task 1: Add the Collection title resolver test

**Files:**
- Create: `apps/qr-vault/src/tests/inline-collection-create.test.ts`
- Later modify: `apps/qr-vault/src/app/qr-detail/inline-collection-create.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'

import { resolveInlineCollectionTitle } from '@/app/qr-detail/inline-collection-create'
import type { Collection } from '@/lib/storage'

const collections: Collection[] = [
  { id: 'dev', title: 'Dev Tools', createdAt: '1', updatedAt: '1' },
  { id: 'foo', title: 'Foo', createdAt: '1', updatedAt: '1' },
]

describe('resolveInlineCollectionTitle', () => {
  it('trims the submitted title before matching or creating', () => {
    expect(resolveInlineCollectionTitle(collections, '  Dev Tools  ')).toEqual({
      kind: 'existing',
      title: 'Dev Tools',
      collection: collections[0],
    })
  })

  it('matches duplicate titles case-sensitively', () => {
    expect(resolveInlineCollectionTitle(collections, 'foo')).toEqual({
      kind: 'new',
      title: 'foo',
    })
  })

  it('returns empty for whitespace-only titles', () => {
    expect(resolveInlineCollectionTitle(collections, '   ')).toEqual({
      kind: 'empty',
      title: '',
    })
  })
})
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
pnpm --filter qr-vault test -- src/tests/inline-collection-create.test.ts
```

Expected: FAIL because `@/app/qr-detail/inline-collection-create` does not exist.

---

### Task 2: Implement QR-detail Collection creation logic

**Files:**
- Create: `apps/qr-vault/src/app/qr-detail/inline-collection-create.ts`
- Test: `apps/qr-vault/src/tests/inline-collection-create.test.ts`

- [ ] **Step 1: Add the resolver and hook**

```ts
import { useCallback, type Dispatch, type SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { nanoid8 } from '@/lib/ids'
import {
  upsertCollection,
  type Collection,
  type VaultData,
} from '@/lib/storage'

export type CreateCollectionResult = 'created' | 'selected-existing'

export type InlineCollectionTitleResult =
  | { kind: 'empty'; title: '' }
  | { kind: 'existing'; title: string; collection: Collection }
  | { kind: 'new'; title: string }

type InlineCollectionCreateParams = {
  collections: Collection[]
  setCollectionIds: Dispatch<SetStateAction<string[]>>
  updateVault: (updater: (current: VaultData) => VaultData) => void
}

export function resolveInlineCollectionTitle(
  collections: Collection[],
  rawTitle: string,
): InlineCollectionTitleResult {
  const title = rawTitle.trim()
  if (!title) return { kind: 'empty', title }
  const collection = collections.find((item) => item.title === title)
  if (collection) return { kind: 'existing', title, collection }
  return { kind: 'new', title }
}

export function useInlineCollectionCreate({
  collections,
  setCollectionIds,
  updateVault,
}: InlineCollectionCreateParams) {
  const { t } = useTranslation()

  return useCallback(
    (rawTitle: string): CreateCollectionResult => {
      const result = resolveInlineCollectionTitle(collections, rawTitle)
      if (result.kind === 'empty') return 'selected-existing'

      const collectionId = result.kind === 'existing' ? result.collection.id : nanoid8()
      if (result.kind === 'new') {
        updateVault((current) =>
          upsertCollection(current, { id: collectionId, title: result.title }),
        )
      }

      setCollectionIds((ids) => (ids.includes(collectionId) ? ids : [...ids, collectionId]))
      toast.success(
        t(
          result.kind === 'existing'
            ? 'collectionPicker.existingSelected'
            : 'collectionPicker.createdAndSelected',
        ),
      )

      return result.kind === 'existing' ? 'selected-existing' : 'created'
    },
    [collections, setCollectionIds, t, updateVault],
  )
}
```

- [ ] **Step 2: Run the focused test and verify it passes**

Run:

```bash
pnpm --filter qr-vault test -- src/tests/inline-collection-create.test.ts
```

Expected: PASS.

---

### Task 3: Add i18n keys

**Files:**
- Modify: `apps/qr-vault/src/i18n/locales/en.json`
- Modify: `apps/qr-vault/src/i18n/locales/zh-CN.json`
- Test: `apps/qr-vault/src/tests/i18n.test.ts`

- [ ] **Step 1: Add English keys under `collectionPicker`**

```json
"collectionPicker": {
  "noCollections": "no collections yet",
  "newCollection": "New",
  "collectionName": "Collection name",
  "createCollection": "Create",
  "cancelCreate": "Cancel",
  "nameRequired": "Collection name is required",
  "createdAndSelected": "Collection created and selected",
  "existingSelected": "Existing collection selected"
}
```

- [ ] **Step 2: Add Simplified Chinese keys under `collectionPicker`**

```json
"collectionPicker": {
  "noCollections": "还没有合集",
  "newCollection": "新建",
  "collectionName": "Collection 名称",
  "createCollection": "创建",
  "cancelCreate": "取消",
  "nameRequired": "请输入 Collection 名称",
  "createdAndSelected": "已创建并选中 Collection",
  "existingSelected": "已选中已有 Collection"
}
```

- [ ] **Step 3: Run the i18n sync test**

Run:

```bash
pnpm --filter qr-vault test -- src/tests/i18n.test.ts
```

Expected: PASS, proving both locale files expose the same flattened keys.

---

### Task 4: Build the Collections section wrapper

**Files:**
- Create: `apps/qr-vault/src/app/qr-detail/collections-section.tsx`
- Later modify: `apps/qr-vault/src/app/qr-detail/qr-detail-form-card.tsx`

- [ ] **Step 1: Add the section component**

```tsx
import { Link } from '@tanstack/react-router'
import { ArrowRight, Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { CollectionPicker } from '@/components/collection-picker'
import { Button } from '@/components/shadcn-ui/button'
import type { CreateCollectionResult } from '@/app/qr-detail/inline-collection-create'
import type { VaultData } from '@/lib/storage'

type CollectionsSectionProps = {
  collectionIds: string[]
  collections: VaultData['collections']
  onCollectionIdsChange: (next: string[]) => void
  onCreateCollection: (title: string) => CreateCollectionResult
}

export function CollectionsSection({
  collectionIds,
  collections,
  onCollectionIdsChange,
  onCreateCollection,
}: CollectionsSectionProps) {
  const { t } = useTranslation()
  const [isCreating, setIsCreating] = useState(false)

  return (
    <section className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
            {t('common.collections')}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            {t('qrDetail.assignCollections')}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsCreating(true)}
            aria-expanded={isCreating}
          >
            <Plus />
            {t('collectionPicker.newCollection')}
          </Button>
          <Link
            to="/collections"
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs font-medium"
          >
            {t('common.manage')} <ArrowRight className="size-3" />
          </Link>
        </div>
      </div>
      <CollectionPicker
        collections={collections}
        isCreating={isCreating}
        selectedIds={collectionIds}
        onCancelCreate={() => setIsCreating(false)}
        onChange={onCollectionIdsChange}
        onCreateCollection={onCreateCollection}
      />
    </section>
  )
}
```

---

### Task 5: Add inline create UI to `CollectionPicker`

**Files:**
- Modify: `apps/qr-vault/src/components/collection-picker.tsx`

- [ ] **Step 1: Extend props and render the inline row**

Use this structure while preserving the existing chip label rendering:

```tsx
import { Check } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { CreateCollectionResult } from '@/app/qr-detail/inline-collection-create'
import { Button } from '@/components/shadcn-ui/button'
import { Input } from '@/components/shadcn-ui/input'
import type { Collection } from '@/lib/storage'
import { cn } from '@/lib/utils'

type CollectionPickerProps = {
  collections: Collection[]
  isCreating?: boolean
  selectedIds: string[]
  onCancelCreate?: () => void
  onChange: (ids: string[]) => void
  onCreateCollection?: (title: string) => CreateCollectionResult
}
```

Add state and handlers:

```tsx
const [draftTitle, setDraftTitle] = useState('')
const [error, setError] = useState('')
const inputRef = useRef<HTMLInputElement>(null)

useEffect(() => {
  if (isCreating) inputRef.current?.focus()
}, [isCreating])

function resetCreate() {
  setDraftTitle('')
  setError('')
  onCancelCreate?.()
}

function submitCreate() {
  if (!onCreateCollection) return
  const title = draftTitle.trim()
  if (!title) {
    setError(t('collectionPicker.nameRequired'))
    return
  }
  onCreateCollection(title)
  resetCreate()
}
```

Render this above the chips whenever `isCreating` is true:

```tsx
{isCreating && (
  <div className="rounded-lg border bg-background/70 p-2.5 shadow-sm">
    <div className="flex flex-col gap-2 sm:flex-row">
      <Input
        ref={inputRef}
        value={draftTitle}
        aria-invalid={Boolean(error)}
        aria-label={t('collectionPicker.collectionName')}
        placeholder={t('collectionPicker.collectionName')}
        onChange={(event) => {
          setDraftTitle(event.target.value)
          if (error) setError('')
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            submitCreate()
          }
          if (event.key === 'Escape') {
            event.preventDefault()
            resetCreate()
          }
        }}
      />
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={submitCreate}>
          {t('collectionPicker.createCollection')}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={resetCreate}>
          {t('collectionPicker.cancelCreate')}
        </Button>
      </div>
    </div>
    {error && <p className="text-destructive mt-1.5 text-xs">{error}</p>}
  </div>
)}
```

Keep the no-collections empty state after the inline row so the user can still create when the chip list is empty.

---

### Task 6: Wire the QR detail form

**Files:**
- Modify: `apps/qr-vault/src/app/qr-detail/qr-detail-form-card.tsx`
- Modify: `apps/qr-vault/src/app/qr-detail-page.tsx`

- [ ] **Step 1: Update `QrDetailFormCard` props**

Add:

```ts
import { CollectionsSection } from '@/app/qr-detail/collections-section'
import type { CreateCollectionResult } from '@/app/qr-detail/inline-collection-create'
```

Remove direct imports of `Link`, `ArrowRight`, and `CollectionPicker`.

Add the prop:

```ts
onCreateCollection: (title: string) => CreateCollectionResult
```

Replace the existing Collections `<section>` with:

```tsx
<CollectionsSection
  collections={collections}
  collectionIds={collectionIds}
  onCollectionIdsChange={onCollectionIdsChange}
  onCreateCollection={onCreateCollection}
/>
```

- [ ] **Step 2: Wire the hook in `QrDetailPage`**

Add:

```ts
import { useInlineCollectionCreate } from '@/app/qr-detail/inline-collection-create'
```

After the local state declarations, add:

```ts
const createCollection = useInlineCollectionCreate({
  collections: data.collections,
  setCollectionIds,
  updateVault,
})
```

Pass it into `QrDetailFormCard`:

```tsx
onCreateCollection={createCollection}
```

---

### Task 7: Run automated checks

**Files:**
- Verify all changed files.

- [ ] **Step 1: Run focused tests**

```bash
pnpm --filter qr-vault test -- src/tests/inline-collection-create.test.ts src/tests/i18n.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run app tests**

```bash
pnpm --filter qr-vault test
```

Expected: PASS.

- [ ] **Step 3: Run lint**

```bash
pnpm --filter qr-vault lint
```

Expected: PASS, including max-lines.

- [ ] **Step 4: Run build**

```bash
pnpm --filter qr-vault build
```

Expected: PASS.

---

### Task 8: Verify in Agent Browser

**Files:**
- No code changes.

- [ ] **Step 1: Start the dev server**

```bash
pnpm --filter qr-vault dev
```

Expected: Vite serves QR Vault on `http://localhost:5173/` or the next available port.

- [ ] **Step 2: Open a QR detail page**

```bash
AGENT_BROWSER_SESSION_NAME=guoba agent-browser open http://localhost:5173/#/q/ZencKvbJ
AGENT_BROWSER_SESSION_NAME=guoba agent-browser snapshot -i -c
```

Expected: The QR edit page is visible and the Collections section has `New` and `Manage`.

- [ ] **Step 3: Verify create, auto-select, and Save semantics**

In Agent Browser:

1. Click `New`.
2. Type a unique Collection title.
3. Press Enter.
4. Confirm the new chip appears at the end and is selected.
5. Reload before pressing Save if needed to confirm QR membership is not persisted by creation alone.
6. Recreate/select the Collection, click top `Save`, reload, and confirm the association persists.

Expected: New Collection persists globally; QR association persists only after Save.

---

### Task 9: Commit and push

**Files:**
- Stage only implementation and plan files.
- Leave unrelated `apps/qr-vault/docs/ui-review-2026-06.md` untracked.

- [ ] **Step 1: Check status and diff**

```bash
git status --short --branch
git diff --stat
```

Expected: only the inline Collection implementation, tests, i18n, plan/spec-related files are changed; unrelated untracked docs remain untracked.

- [ ] **Step 2: Commit**

```bash
git add \
  docs/superpowers/plans/2026-06-24-qr-vault-inline-collection-create.md \
  apps/qr-vault/src/app/qr-detail/inline-collection-create.ts \
  apps/qr-vault/src/app/qr-detail/collections-section.tsx \
  apps/qr-vault/src/app/qr-detail-page.tsx \
  apps/qr-vault/src/app/qr-detail/qr-detail-form-card.tsx \
  apps/qr-vault/src/components/collection-picker.tsx \
  apps/qr-vault/src/i18n/locales/en.json \
  apps/qr-vault/src/i18n/locales/zh-CN.json \
  apps/qr-vault/src/tests/inline-collection-create.test.ts
git commit -m "feat: create collections from qr editor"
```

Expected: commit succeeds and lint-staged keeps formatting stable.

- [ ] **Step 3: Push existing PR branch**

```bash
git push
```

Expected: branch `codex/qr-vault-signal-console` is pushed and existing PR updates.

---

## Self-Review

- Spec coverage: title-only creation, trim, case-sensitive duplicate handling, selected chip order, no QR auto-save, i18n, empty state, keyboard behavior, toast feedback, and Agent Browser verification are all covered.
- Placeholder scan: no TBD/TODO/fill-in-later steps remain.
- Type consistency: `CreateCollectionResult`, `resolveInlineCollectionTitle()`, `useInlineCollectionCreate()`, and `onCreateCollection` use the same names across tasks.
