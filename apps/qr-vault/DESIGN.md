# QR Vault Design System

QR Vault is a local-first console for saving, editing, scanning, and sharing QR-backed deep links. The interface should feel like a private signal desk: precise, compact, high-contrast, and trustworthy. It is a working tool, not a landing page.

## Visual Theme

- Direction: private signal console.
- Mood: technical, calm, sharp, quietly premium.
- Primary memory: white scan plates floating inside dark or paper-light instrument panels.
- Density: compact enough for repeated work; never airy marketing spacing.
- Geometry: crisp rectangles, 8px radius or less, thin rules, clear alignment.
- Texture: avoid decorative grids on page backgrounds and QR panels; the interface should stay clean and scan-safe.

## Color Roles

Use semantic roles rather than one-off colors.

- Canvas: near-white in light mode, deep ink in dark mode.
- Panel: slightly tinted raised surfaces, never pure flat gray everywhere.
- QR plate: always white or near-white so generated QR codes remain scannable.
- Signal accent: neutral ink in light mode and paper-white in dark mode; selected navigation and primary actions should match the original black/white QR theme.
- Success accent: neutral valid-state treatment, not a green brand color. Reserve green only for tiny semantic cues if absolutely necessary.
- Warning accent: amber for pending destructive confirmation.
- Danger accent: red for destructive actions and invalid data.
- Muted text: enough contrast for operational labels; do not make helper copy decorative.

## Typography

- Font family: Geist for UI text, Geist Mono for URLs, counts, schemes, hashes, and storage labels.
- Page titles: compact 24-32px, semibold, no negative tracking.
- Section labels: 10-11px uppercase, medium weight, generous letter spacing.
- Body: 14px, 1.5 line height.
- Long URLs: mono, break-all or truncate with title/tooltips where space is constrained.

## Components

- Sidebar: behave like a docked instrument rail. Active items should feel selected by state, not by large color fills.
- Cards and panels: thin border plus subtle shadow/ring. Radius must stay at or below 8px.
- Buttons: icons first. Text buttons are for commands that need clarity, such as Save, Import, Replace, Copy share link.
- Badges: small status chips for valid, invalid, local, static, and collection counts.
- Inputs: compact, high-contrast focus ring, mono for URL fields.
- QR preview: QR image sits on a plain white scan plate without grid or ruled texture.
- Empty states: neutral and instructive. Do not show red invalid states before the user has typed.
- Destructive confirmation: make the armed window visible with amber/red treatment and a clear countdown/progress affordance.

## Layout

- The workspace is the center of the product: list on the left, live QR inspector on the right.
- Desktop layout should feel like an operations console with constrained scroll regions.
- Mobile layout should collapse to a single column without hiding primary actions.
- Header chrome should stay compact; do not introduce hero sections.
- Use consistent panel spacing: 12px small, 16px normal, 20px large.

## Motion

- Motion is functional: hover lift, selected-row emphasis, QR panel settle, destructive confirmation progress.
- Keep animations under 200ms for controls.
- Respect reduced-motion by keeping transitions simple and nonessential.

## Content Rules

- Preserve the local-first privacy promise.
- Use "QR", "URL", "collection", and "local" consistently.
- In Chinese, avoid mixed English labels unless the term is a product concept such as QR or URL.
- Do not add marketing claims that imply cloud sync, accounts, or analytics.

## Do

- Make valid and invalid URL states visually obvious.
- Keep QR plates scan-safe in both themes.
- Keep visual polish reusable through tokens and shared classes.
- Verify every visible UI change in a real browser.

## Do Not

- Do not clone Vercel, Linear, or any other brand.
- Do not use decorative purple gradients or generic SaaS hero sections.
- Do not put cards inside cards unless the inner surface is a functional control.
- Do not reduce information density to make the app look like a landing page.
- Do not change storage, routing, or QR behavior for visual reasons.
