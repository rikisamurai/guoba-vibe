# QR Vault — New-User Onboarding Design

- **Date:** 2026-05-28
- **App:** `apps/qr-vault`
- **Status:** Design approved, pending implementation plan

## 1. Goal

When a new user first opens QR Vault, walk them through a 4-step spotlight tour that ends with them having saved their first QR code. Demo entries remain visible as background context, but the user creates their own QR during the tour rather than just reading about the demo.

## 2. Non-goals

- No internationalization (English copy only; demo data and existing UI are already English-only).
- No "advanced user can skip ahead by N steps" UI.
- No onboarding on `/share`, `/import`, `/collections`, or QR detail pages.
- No analytics / event tracking for onboarding completion.
- No automated E2E coverage (the project has no Playwright/Cypress harness today; we will not introduce one for this feature).

## 3. Trigger & persistence

- New `localStorage` key: `qr-vault:onboarding-v1`.
- Possible values: `"done"` (user completed all 4 steps), `"skipped"` (user clicked Skip or pressed ESC), or absent (never seen).
- The `-v1` suffix lets us bump to `-v2` later to force a re-tour for everyone if the script materially changes.
- When the user navigates to `/` and the key is absent, the tour auto-starts.
- Both completion paths write the key; the tour does not re-trigger on later visits.
- The existing first-visit demo-data write in `vault-storage` is untouched. The tour runs against whatever the Vault page already shows (demo entries plus the new one the user will create).

## 4. Step script

All copy is final English text.

| # | Anchor (`data-tour` attribute) | Title | Body | User action |
|---|---|---|---|---|
| 1 | `nav-new-qr` — sidebar `New QR` button | **Welcome to QR Vault** | Your local-first vault for QR codes and deep links. Let's create your first one. | Click **Next** — `onNextClick` navigates to `/new` |
| 2 | `new-url-input` — URL field on `/new` | **Paste any URL or deep link** | QR Vault works with any web URL or app deep link. Try one of your own, or use the sample below. (Inline sample chip: `https://example.com`, click to insert) | Click **Next** |
| 3 | `qr-preview` — preview panel container | **Live preview** | Your QR code is generated instantly on the device. The parsed URL appears below so you can verify it. | Click **Next** |
| 4 | `qr-save` — Save button | **Save it** | Stored locally in your browser — nothing leaves this device. You can edit, organize into Collections, or share via link anytime. | Click **Finish** (which closes the tour) or click **Save** in the app |

Per-step controls:
- Buttons: `Skip` (left), `Back` (where applicable), `Next` / `Finish` (right).
- Step indicator: `Step N of 4`.
- `ESC` and clicking the backdrop both treat as Skip (writes `"skipped"`).

## 5. Cross-route advancement

Step 1 → 2 changes route from `/` to `/new`. driver.js does not natively bridge route changes, so:

- The driver instance lives in `app-shell.tsx` via `useOnboarding()` and persists across route transitions (it is not unmounted with the page).
- Step 1's `onNextClick` calls `router.navigate({ to: "/new", search: { url: "" } })` instead of letting driver advance immediately.
- After navigation, a `useEffect` keyed on `location.pathname` waits for `[data-tour="new-url-input"]` to appear in the DOM (using `requestAnimationFrame` polling, max 20 frames ≈ 333 ms; if it never appears, abort gracefully and write `"skipped"`).
- Once the element is present, the hook calls `driverInstance.moveNext()` to advance to step 2.

Steps 2 → 3 → 4 all live on `/new`, so default driver.js behavior handles them.

## 6. Replay entry point

- Placed in `SidebarFooter`, next to the existing `ThemeToggle`.
- Icon-only button using `HelpCircle` from `lucide-react` (already a project dep).
- `aria-label="Replay onboarding"`, tooltip text `Replay onboarding`.
- On click: clear `qr-vault:onboarding-v1` from `localStorage`, navigate to `/` if not already there, then `driverInstance.drive(0)`.

## 7. Module layout

```
apps/qr-vault/src/app/onboarding/
  use-onboarding.ts        # hook: builds driver instance, auto-trigger on mount, exposes restart()
  onboarding-steps.ts      # step definitions (selectors, copy, per-step hooks)
  onboarding-storage.ts    # localStorage read/write with versioned key
```

Files that gain `data-tour` attributes:
- `app-shell.tsx` — `New QR` SidebarMenuButton gets `data-tour="nav-new-qr"`.
- The "new QR" route component (currently rendered for `/new`) — URL input gets `data-tour="new-url-input"`; the chip-insert UI is added alongside it; the Save button gets `data-tour="qr-save"`.
- `qr-preview.tsx` — outer container gets `data-tour="qr-preview"`.

`app-shell.tsx` calls `useOnboarding()` once at mount; the hook reads storage, sets up the driver, and exposes `restart()` for the footer button.

## 8. Styling

driver.js ships its own CSS (`driver.js/dist/driver.css`); import it once from `styles.css` (or `main.tsx`). Append overrides in `styles.css`:

- `.driver-popover` background → `var(--popover)`, foreground → `var(--popover-foreground)`, border → `var(--border)`, radius matches existing tokens.
- `.driver-popover-next-btn`, `.driver-popover-prev-btn`, `.driver-popover-close-btn` styled to match the existing `Button` primary / secondary / ghost variants — easiest path is to copy the Tailwind classes via a global CSS rule rather than re-render with the React `<Button>` component.
- Backdrop opacity unchanged from driver.js defaults; both light and dark mode read theme tokens, so no separate `[data-theme="dark"]` overrides are needed.

## 9. Accessibility

- driver.js applies `role="dialog"` and manages focus on the popover; verify focus lands on the next/finish button by default.
- `Skip`, `Back`, `Next`, `Finish` are real `<button>` elements with visible focus rings.
- Keyboard: `Tab` cycles popover buttons, `ESC` closes (treated as Skip), arrow keys advance/retreat per driver.js defaults — leave defaults on.
- Spotlight target keeps its own focus outline; we do not suppress it.

## 10. Testing

- **Unit (vitest):** `onboarding-storage.ts` — get returns `null` when key absent, set writes the right value, clear removes the key, version key is namespaced correctly.
- **Manual verification checklist** (goes into the PR description):
  - Fresh `localStorage` → visiting `/` auto-starts the tour at step 1.
  - Clicking `Next` on step 1 navigates to `/new` and advances to step 2.
  - Skip on any step writes `"skipped"` and the tour does not re-trigger on reload.
  - Completing step 4 writes `"done"`.
  - Footer Help button restarts the tour from step 1.
  - Tour copy and controls render correctly in both light and dark mode.
  - Tour does not auto-trigger on `/share`, `/import`, `/collections`, or QR detail pages.

## 11. Dependencies

- Add `driver.js@^1.3.x` (~12 KB minified / ~5 KB gzip, MIT license) via `pnpm --filter qr-vault add driver.js`.
- No other new dependencies; `lucide-react` already provides `HelpCircle`.

## 12. Out of scope / future work

- Localization of step copy.
- Tours for advanced flows (Collections, Sharing, Import/Export).
- A "what's new" tour triggered by version bumps.
- Analytics on completion rate.
