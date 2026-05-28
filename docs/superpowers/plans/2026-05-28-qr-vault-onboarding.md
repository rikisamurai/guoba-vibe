# QR Vault Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 4-step spotlight onboarding tour to `apps/qr-vault` that walks new users from the sidebar `New QR` button through saving their first QR code, with localStorage-based "seen" tracking and a Replay entry point in the sidebar footer.

**Architecture:** Use `driver.js` v1 as the tour engine. A single `useOnboarding()` hook lives in `app-shell.tsx` (which stays mounted across all in-app routes) and owns the driver instance, the auto-start check, the cross-route advancement bridge, and the public `restart()` API. Step definitions and the localStorage wrapper are split into focused modules.

**Tech Stack:** React 19 + TypeScript, TanStack React Router (hash history), Tailwind v4, driver.js@^1.3, lucide-react, vitest.

**Spec reference:** `docs/superpowers/specs/2026-05-28-qr-vault-onboarding-design.md`

---

## File Structure

**New files:**
- `apps/qr-vault/src/app/onboarding/onboarding-storage.ts` — versioned localStorage wrapper (`getOnboardingStatus`, `setOnboardingStatus`, `clearOnboardingStatus`).
- `apps/qr-vault/src/app/onboarding/onboarding-steps.ts` — step definitions (selectors, copy, per-step `onNextClick`).
- `apps/qr-vault/src/app/onboarding/use-onboarding.ts` — React hook that builds the driver, auto-starts, bridges route changes, exposes `restart()`.
- `apps/qr-vault/src/tests/onboarding-storage.test.ts` — vitest unit tests.

**Modified files:**
- `apps/qr-vault/package.json` — add `driver.js` dependency.
- `apps/qr-vault/src/styles.css` — import `driver.js/dist/driver.css` and add theme overrides.
- `apps/qr-vault/src/app/app-shell.tsx` — add `data-tour="nav-new-qr"`, call `useOnboarding()`, render Replay button in `SidebarFooter`.
- `apps/qr-vault/src/app/qr-detail-page.tsx` — add `data-tour="qr-save"` on Save button; QR preview anchor is on the wrapper of `<QrPreview>` so add it there.
- `apps/qr-vault/src/components/url-editor.tsx` — add `data-tour="new-url-input"` on the Full URL `<Textarea>`.

---

## Task 1: Install driver.js dependency

**Files:**
- Modify: `apps/qr-vault/package.json`

- [ ] **Step 1: Install driver.js into the qr-vault workspace**

Run from repo root:

```bash
pnpm --filter qr-vault add driver.js@^1.3.0
```

Expected: `package.json` `dependencies` gains `"driver.js": "^1.3.x"` and `pnpm-lock.yaml` is updated.

- [ ] **Step 2: Verify the install**

Run:

```bash
pnpm --filter qr-vault exec node -e "console.log(require('driver.js/package.json').version)"
```

Expected: prints a `1.3.x` version string with no error.

- [ ] **Step 3: Commit**

```bash
git add apps/qr-vault/package.json pnpm-lock.yaml
git commit -m "qr-vault: add driver.js for onboarding tour"
```

---

## Task 2: Build onboarding-storage with tests (TDD)

**Files:**
- Create: `apps/qr-vault/src/app/onboarding/onboarding-storage.ts`
- Test: `apps/qr-vault/src/tests/onboarding-storage.test.ts`

- [ ] **Step 1: Write the failing test file**

Create `apps/qr-vault/src/tests/onboarding-storage.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ONBOARDING_STORAGE_KEY,
  clearOnboardingStatus,
  getOnboardingStatus,
  setOnboardingStatus,
} from "@/app/onboarding/onboarding-storage";

describe("onboarding-storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("uses a versioned storage key", () => {
    expect(ONBOARDING_STORAGE_KEY).toBe("qr-vault:onboarding-v1");
  });

  it("returns null when the key has never been written", () => {
    expect(getOnboardingStatus()).toBeNull();
  });

  it("writes and reads the 'done' status", () => {
    setOnboardingStatus("done");
    expect(getOnboardingStatus()).toBe("done");
    expect(localStorage.getItem(ONBOARDING_STORAGE_KEY)).toBe("done");
  });

  it("writes and reads the 'skipped' status", () => {
    setOnboardingStatus("skipped");
    expect(getOnboardingStatus()).toBe("skipped");
  });

  it("returns null for an unknown stored value", () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, "weird");
    expect(getOnboardingStatus()).toBeNull();
  });

  it("clearOnboardingStatus removes the key", () => {
    setOnboardingStatus("done");
    clearOnboardingStatus();
    expect(getOnboardingStatus()).toBeNull();
    expect(localStorage.getItem(ONBOARDING_STORAGE_KEY)).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run:

```bash
pnpm --filter qr-vault test -- onboarding-storage
```

Expected: FAIL with module-not-found error on `@/app/onboarding/onboarding-storage`.

- [ ] **Step 3: Create the directory and implementation file**

Create `apps/qr-vault/src/app/onboarding/onboarding-storage.ts`:

```ts
export const ONBOARDING_STORAGE_KEY = "qr-vault:onboarding-v1";

export type OnboardingStatus = "done" | "skipped";

export function getOnboardingStatus(): OnboardingStatus | null {
  const raw = localStorage.getItem(ONBOARDING_STORAGE_KEY);
  if (raw === "done" || raw === "skipped") return raw;
  return null;
}

export function setOnboardingStatus(status: OnboardingStatus): void {
  localStorage.setItem(ONBOARDING_STORAGE_KEY, status);
}

export function clearOnboardingStatus(): void {
  localStorage.removeItem(ONBOARDING_STORAGE_KEY);
}
```

- [ ] **Step 4: Run the test, verify it passes**

Run:

```bash
pnpm --filter qr-vault test -- onboarding-storage
```

Expected: PASS, 6 tests green.

- [ ] **Step 5: Commit**

```bash
git add apps/qr-vault/src/app/onboarding/onboarding-storage.ts apps/qr-vault/src/tests/onboarding-storage.test.ts
git commit -m "qr-vault: add onboarding-storage with versioned localStorage key"
```

---

## Task 3: Define the onboarding steps

**Files:**
- Create: `apps/qr-vault/src/app/onboarding/onboarding-steps.ts`

- [ ] **Step 1: Write the step-definition module**

Create `apps/qr-vault/src/app/onboarding/onboarding-steps.ts`:

```ts
import type { DriveStep } from "driver.js";

export const TOUR_SELECTORS = {
  navNewQr: '[data-tour="nav-new-qr"]',
  newUrlInput: '[data-tour="new-url-input"]',
  qrPreview: '[data-tour="qr-preview"]',
  qrSave: '[data-tour="qr-save"]',
} as const;

export type OnboardingStepHooks = {
  /** Called when the user clicks Next on step 1 (sidebar New QR). Navigate to /new. */
  onStartNewQr: () => void;
};

export function buildOnboardingSteps(hooks: OnboardingStepHooks): DriveStep[] {
  return [
    {
      element: TOUR_SELECTORS.navNewQr,
      popover: {
        title: "Welcome to QR Vault",
        description:
          "Your local-first vault for QR codes and deep links. Let's create your first one.",
        side: "right",
        align: "start",
        onNextClick: () => {
          hooks.onStartNewQr();
        },
      },
    },
    {
      element: TOUR_SELECTORS.newUrlInput,
      popover: {
        title: "Paste any URL or deep link",
        description:
          "QR Vault works with any web URL or app deep link. Paste your own, or try a sample like https://example.com.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: TOUR_SELECTORS.qrPreview,
      popover: {
        title: "Live preview",
        description:
          "Your QR code is generated instantly on this device. The parsed URL appears below so you can verify it.",
        side: "left",
        align: "start",
      },
    },
    {
      element: TOUR_SELECTORS.qrSave,
      popover: {
        title: "Save it",
        description:
          "Stored locally in your browser — nothing leaves this device. You can edit, organize into Collections, or share via link anytime.",
        side: "bottom",
        align: "end",
      },
    },
  ];
}
```

- [ ] **Step 2: Verify the module type-checks**

Run:

```bash
pnpm --filter qr-vault exec tsc -b --noEmit
```

Expected: completes with no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add apps/qr-vault/src/app/onboarding/onboarding-steps.ts
git commit -m "qr-vault: define onboarding tour steps and selector constants"
```

---

## Task 4: Build the useOnboarding hook

**Files:**
- Create: `apps/qr-vault/src/app/onboarding/use-onboarding.ts`

- [ ] **Step 1: Write the hook**

Create `apps/qr-vault/src/app/onboarding/use-onboarding.ts`:

```ts
import { useCallback, useEffect, useRef } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { driver, type Driver } from "driver.js";
import "driver.js/dist/driver.css";
import {
  TOUR_SELECTORS,
  buildOnboardingSteps,
} from "@/app/onboarding/onboarding-steps";
import {
  clearOnboardingStatus,
  getOnboardingStatus,
  setOnboardingStatus,
} from "@/app/onboarding/onboarding-storage";

const MAX_WAIT_FRAMES = 20;

/**
 * Wait for a selector to exist in the DOM, up to MAX_WAIT_FRAMES animation
 * frames (~333 ms). Resolves true if found, false if it never appears.
 */
function waitForElement(selector: string): Promise<boolean> {
  return new Promise((resolve) => {
    let frames = 0;
    function check() {
      if (document.querySelector(selector)) {
        resolve(true);
        return;
      }
      if (++frames >= MAX_WAIT_FRAMES) {
        resolve(false);
        return;
      }
      requestAnimationFrame(check);
    }
    requestAnimationFrame(check);
  });
}

export function useOnboarding() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const driverRef = useRef<Driver | null>(null);
  const pendingAdvanceRef = useRef(false);
  const autoStartedRef = useRef(false);

  // Build the driver instance once.
  useEffect(() => {
    const steps = buildOnboardingSteps({
      onStartNewQr: () => {
        pendingAdvanceRef.current = true;
        void navigate({ to: "/new", search: { url: "" } });
      },
    });

    const instance = driver({
      showProgress: true,
      showButtons: ["next", "previous", "close"],
      nextBtnText: "Next",
      prevBtnText: "Back",
      doneBtnText: "Finish",
      closeBtnText: "Skip",
      progressText: "Step {{current}} of {{total}}",
      allowClose: true,
      onDestroyStarted: () => {
        // User clicked X / pressed ESC / clicked overlay. Decide done vs skipped.
        const activeIndex = instance.getActiveIndex();
        const total = instance.getConfig().steps?.length ?? 0;
        const isLast = activeIndex !== undefined && activeIndex === total - 1;
        setOnboardingStatus(isLast ? "done" : "skipped");
        instance.destroy();
      },
      steps,
    });

    driverRef.current = instance;

    return () => {
      instance.destroy();
      driverRef.current = null;
    };
  }, [navigate]);

  // Auto-start once, only on /, only if never seen.
  useEffect(() => {
    if (autoStartedRef.current) return;
    if (pathname !== "/") return;
    if (getOnboardingStatus() !== null) return;
    const instance = driverRef.current;
    if (!instance) return;
    autoStartedRef.current = true;
    void waitForElement(TOUR_SELECTORS.navNewQr).then((found) => {
      if (!found) return;
      instance.drive(0);
    });
  }, [pathname]);

  // Bridge: when route changes to /new while a step-1 advance is pending,
  // wait for the URL input to mount, then advance the tour.
  useEffect(() => {
    if (!pendingAdvanceRef.current) return;
    if (pathname !== "/new") return;
    const instance = driverRef.current;
    if (!instance) return;
    pendingAdvanceRef.current = false;
    void waitForElement(TOUR_SELECTORS.newUrlInput).then((found) => {
      if (!found) return;
      instance.moveNext();
    });
  }, [pathname]);

  const restart = useCallback(() => {
    clearOnboardingStatus();
    autoStartedRef.current = false;
    pendingAdvanceRef.current = false;
    const instance = driverRef.current;
    if (!instance) return;
    if (pathname !== "/") {
      void navigate({ to: "/" }).then(() => {
        void waitForElement(TOUR_SELECTORS.navNewQr).then((found) => {
          if (found) instance.drive(0);
        });
      });
      return;
    }
    void waitForElement(TOUR_SELECTORS.navNewQr).then((found) => {
      if (found) instance.drive(0);
    });
  }, [navigate, pathname]);

  return { restart };
}
```

- [ ] **Step 2: Type-check**

Run:

```bash
pnpm --filter qr-vault exec tsc -b --noEmit
```

Expected: no TypeScript errors. If `Driver` type does not exist, replace with `ReturnType<typeof driver>` and re-run.

- [ ] **Step 3: Commit**

```bash
git add apps/qr-vault/src/app/onboarding/use-onboarding.ts
git commit -m "qr-vault: add useOnboarding hook with cross-route advancement"
```

---

## Task 5: Add `data-tour` anchors to UI components

**Files:**
- Modify: `apps/qr-vault/src/app/app-shell.tsx`
- Modify: `apps/qr-vault/src/components/url-editor.tsx`
- Modify: `apps/qr-vault/src/app/qr-detail-page.tsx`

- [ ] **Step 1: Anchor the sidebar `New QR` button**

In `apps/qr-vault/src/app/app-shell.tsx`, the `NavLink` component currently renders every nav item identically. Add a per-item `dataTour` field and emit it on the `Link`. Change `NavItem` and `NAV_ITEMS`:

```ts
type NavItem = {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  exact?: boolean;
  search?: Record<string, string>;
  dataTour?: string;
};

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Vault", icon: Database, exact: true },
  { to: "/collections", label: "Collections", icon: FolderOpen },
  {
    to: "/new",
    label: "New QR",
    icon: Plus,
    exact: true,
    search: { url: "" },
    dataTour: "nav-new-qr",
  },
  { to: "/import", label: "Import", icon: Download, exact: true },
];
```

Then in `NavLink`, pass it through to the `<Link>` via a spread:

```tsx
<Link
  to={item.to}
  search={item.search as never}
  {...(item.dataTour ? { "data-tour": item.dataTour } : {})}
>
  <item.icon />
  <span>{item.label}</span>
</Link>
```

- [ ] **Step 2: Anchor the URL textarea**

In `apps/qr-vault/src/components/url-editor.tsx`, find the Full URL `<Textarea>` (around line 70-77) and add `data-tour="new-url-input"`:

```tsx
<Textarea
  id="url-full"
  data-tour="new-url-input"
  value={value}
  onChange={(event) => onChange(event.target.value)}
  rows={3}
  className="font-mono text-xs"
  placeholder="xhsdiscover://rn/wakanda/buyer-conversion?sku_id=1"
/>
```

- [ ] **Step 3: Anchor the QR preview and Save button**

In `apps/qr-vault/src/app/qr-detail-page.tsx`:

- Wrap `<QrPreview>` (around line 253) in a `<div data-tour="qr-preview">`:

```tsx
<div data-tour="qr-preview">
  <QrPreview title={title || "QR code"} url={url} size="lg" />
</div>
```

- Add `data-tour="qr-save"` to the Save `<Button>` (around line 171):

```tsx
<Button onClick={saveQr} type="button" data-tour="qr-save">
  {saved ? <Check /> : <Save />}
  {saved ? "Saved" : "Save"}
</Button>
```

- [ ] **Step 4: Type-check and run existing tests**

Run:

```bash
pnpm --filter qr-vault exec tsc -b --noEmit && pnpm --filter qr-vault test
```

Expected: tsc passes; all existing tests still pass.

- [ ] **Step 5: Commit**

```bash
git add apps/qr-vault/src/app/app-shell.tsx apps/qr-vault/src/components/url-editor.tsx apps/qr-vault/src/app/qr-detail-page.tsx
git commit -m "qr-vault: add data-tour anchors for onboarding"
```

---

## Task 6: Wire the hook + Replay button into app-shell

**Files:**
- Modify: `apps/qr-vault/src/app/app-shell.tsx`

- [ ] **Step 1: Build the OnboardingReplayButton helper**

Add this component at the top of `apps/qr-vault/src/app/app-shell.tsx` (after imports, before `NavItem` type). Update the imports at the same time — add `HelpCircle` to the lucide-react import and add the `useOnboarding` import and the `Button` import:

```tsx
import { Database, Download, FolderOpen, HelpCircle, Plus, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOnboarding } from "@/app/onboarding/use-onboarding";
```

Then the component:

```tsx
function OnboardingReplayButton() {
  const { restart } = useOnboarding();
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={restart}
      aria-label="Replay onboarding"
      title="Replay onboarding"
    >
      <HelpCircle />
    </Button>
  );
}
```

- [ ] **Step 2: Render the button in the footer**

In `AppShell`, replace the existing `<SidebarFooter>` block:

```tsx
<SidebarFooter>
  <div className="flex items-center justify-between gap-2 px-2 py-1 group-data-[collapsible=icon]:hidden">
    <span className="font-mono text-xs text-muted-foreground">v0.1.0</span>
    <div className="flex items-center gap-1">
      <OnboardingReplayButton />
      <ThemeToggle />
    </div>
  </div>
  <div className="hidden group-data-[collapsible=icon]:flex flex-col items-center gap-1">
    <OnboardingReplayButton />
    <ThemeToggle />
  </div>
</SidebarFooter>
```

Note: `OnboardingReplayButton` calls `useOnboarding()`, which mounts the driver. Since the button is rendered in both collapsed and expanded variants, React mounts only the visible one — but to avoid double-mounting if both are ever in the tree at once, the hook is idempotent (guarded by `driverRef`/`autoStartedRef`) and only one variant is rendered at a time (the other is `display: none` via Tailwind, but React still mounts both). To avoid the dual-mount, refactor: render the button once and reuse via CSS. Replace the block above with this single-instance version:

```tsx
<SidebarFooter>
  <div className="flex items-center justify-between gap-2 px-2 py-1 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center">
    <span className="font-mono text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
      v0.1.0
    </span>
    <div className="flex items-center gap-1 group-data-[collapsible=icon]:flex-col">
      <OnboardingReplayButton />
      <ThemeToggle />
    </div>
  </div>
</SidebarFooter>
```

- [ ] **Step 3: Type-check**

Run:

```bash
pnpm --filter qr-vault exec tsc -b --noEmit
```

Expected: no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add apps/qr-vault/src/app/app-shell.tsx
git commit -m "qr-vault: wire onboarding hook and replay button in sidebar"
```

---

## Task 7: Style overrides to match the radix-nova theme

**Files:**
- Modify: `apps/qr-vault/src/styles.css`

- [ ] **Step 1: Append driver.js theme overrides**

Append to the end of `apps/qr-vault/src/styles.css`:

```css
/* driver.js onboarding overrides — match radix-nova theme tokens */
.driver-popover {
  background: var(--popover);
  color: var(--popover-foreground);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  font-family: inherit;
  box-shadow: 0 10px 38px -10px rgba(0, 0, 0, 0.35), 0 10px 20px -15px rgba(0, 0, 0, 0.2);
}

.driver-popover-title {
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--popover-foreground);
}

.driver-popover-description {
  font-size: 0.825rem;
  color: var(--muted-foreground);
  line-height: 1.5;
}

.driver-popover-progress-text {
  font-size: 0.7rem;
  color: var(--muted-foreground);
}

.driver-popover-footer button {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--foreground);
  padding: 0.375rem 0.75rem;
  font-size: 0.8125rem;
  font-weight: 500;
  border-radius: calc(var(--radius) - 2px);
  text-shadow: none;
  cursor: pointer;
}

.driver-popover-footer button:hover {
  background: var(--accent);
  color: var(--accent-foreground);
}

.driver-popover-next-btn {
  background: var(--primary) !important;
  color: var(--primary-foreground) !important;
  border-color: var(--primary) !important;
}

.driver-popover-next-btn:hover {
  filter: brightness(0.95);
}

.driver-popover-close-btn {
  color: var(--muted-foreground);
}

.driver-popover-arrow-side-top.driver-popover-arrow {
  border-top-color: var(--popover);
}
.driver-popover-arrow-side-bottom.driver-popover-arrow {
  border-bottom-color: var(--popover);
}
.driver-popover-arrow-side-left.driver-popover-arrow {
  border-left-color: var(--popover);
}
.driver-popover-arrow-side-right.driver-popover-arrow {
  border-right-color: var(--popover);
}
```

- [ ] **Step 2: Run the dev server and visually verify**

Run in one terminal:

```bash
pnpm --filter qr-vault dev
```

In a browser at `http://localhost:5173/` (or whichever port Vite assigns):

1. Open devtools, run `localStorage.removeItem("qr-vault:onboarding-v1")` and reload.
2. Tour should auto-start on the New QR sidebar button.
3. Toggle theme (light/dark) — popover background, text, and buttons should remain readable.

Stop the dev server when done.

- [ ] **Step 3: Commit**

```bash
git add apps/qr-vault/src/styles.css
git commit -m "qr-vault: style driver.js popover to match theme tokens"
```

---

## Task 8: Manual end-to-end verification

**Files:** none modified.

- [ ] **Step 1: Build to catch any production-mode issues**

Run:

```bash
pnpm --filter qr-vault build
```

Expected: build completes with no errors.

- [ ] **Step 2: Preview the production build and run the checklist**

Run:

```bash
pnpm --filter qr-vault preview
```

Open the preview URL and verify, ticking each item:

- [ ] Fresh state: in devtools, `localStorage.clear()` and reload `/` — tour auto-starts at step 1 highlighting the sidebar `New QR` button.
- [ ] Step 1 → 2: click **Next** — route changes to `/new` and step 2 highlights the Full URL textarea.
- [ ] Step 2 → 3: click **Next** — step 3 highlights the QR preview panel.
- [ ] Step 3 → 4: click **Next** — step 4 highlights the Save button.
- [ ] Step 4 **Finish**: closes the tour and writes `localStorage["qr-vault:onboarding-v1"] === "done"`.
- [ ] Reload `/` — tour does NOT re-trigger.
- [ ] Click Replay button in sidebar footer — tour starts again from step 1.
- [ ] Mid-tour, press ESC — tour closes and writes `"skipped"`; reload — tour does NOT re-trigger.
- [ ] Visit `/share?url=https://example.com` directly — no tour appears.
- [ ] Toggle dark mode mid-tour — popover styling remains legible.
- [ ] Collapsed sidebar (click the chevron in the header) — Replay button is still visible and clickable.

If any item fails, fix in the relevant module and re-run the checklist.

- [ ] **Step 3: Run all unit tests once more**

Run:

```bash
pnpm --filter qr-vault test
```

Expected: all tests pass.

- [ ] **Step 4: If any fixes were committed during verification, you are done. Otherwise no commit needed.**
