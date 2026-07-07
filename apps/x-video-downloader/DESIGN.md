# X Video Downloader Design System

X Video Downloader is a private utility for resolving and downloading videos from X post links. The interface should feel like a compact download workbench: focused, secure, and fast enough for repeated use from a phone, while still credible on a desktop screen.

## Visual Direction

- Direction: private download workbench.
- Mood: quiet, technical, compact, and trustworthy.
- Density: mobile-first controls with enough breathing room for long URLs and video choices.
- Geometry: crisp panels, thin rules, and functional 8px-ish corners. Avoid decorative nested cards.
- Texture: restrained dark surfaces with one green signal accent and amber for warnings or parser messages.

## Color Roles

- Canvas: near-black, with subtle green glow only at the page edge.
- Frame: translucent dark shell that adapts from mobile full-screen to desktop workbench.
- Panel: dark raised surfaces for parser input and video rows.
- Signal accent: green for primary parse/download action and selected state.
- Warning accent: amber for parse failures, parser caveats, and service notices.
- Muted text: gray-green labels and metadata with enough contrast for mobile reading.

## Typography

- Font family: Geist for interface text.
- URL text: mono fallback, wrapped aggressively so long X links never hide the caret.
- Titles: compact and operational; this is not a landing page.
- Labels: short Chinese labels for primary workflows; avoid explanatory copy in the main UI.

## Responsive Layout

- Mobile: single column, full-height app frame, fixed bottom download bar with safe-area padding.
- Tablet: centered wider panel; avoid making the app look like a stretched phone.
- Desktop: wide workbench from `64rem`; parser stays on the left and video selection moves to the right when results exist.
- Desktop download controls are static at the bottom of the workbench, not fixed to the viewport.

## Input Rules

- The X post URL field behaves like a command input, not a normal paragraph editor.
- Long URLs must wrap and keep the current caret visible.
- The link icon belongs to the field chrome and must not steal horizontal text space.
- Enter submits parsing. Do not add multi-line editing affordances unless the product changes.

## Result Rules

- If the parser returns one video, show one real video row and the existing single-video notice.
- If the parser returns multiple videos, support selecting individual videos or all videos.
- Quality selection defaults to the first returned variant, which is treated as highest quality by the parser.
- Never invent multiple video rows when the parser only returns one item.

## Verification

- Verify visible UI changes in a real browser at mobile and desktop viewport sizes.
- Confirm long URL caret visibility before considering input changes complete.
- Confirm the download bar does not overlap video rows on mobile and does not float over content on desktop.
- Do not change auth, parsing, download streaming, or rate-limit behavior for visual reasons.
