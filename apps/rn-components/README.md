# rn-components

React Native component library workspace for simple and complex cross-platform components.

## What Is Included

- Reusable components in `src/components`.
- Web Storybook in `.storybook`, rendered through `@storybook/react-native-web-vite`.
- Native Storybook in `.rnstorybook`, rendered inside the Expo app with `@storybook/react-native`.
- Component regression tests in `src/__tests__`, using Vitest with `react-native-web` as the renderer.

## Components

- `GBButton`: simple button primitive with variants, loading, disabled state, and press handling.
- `StatusChip`: simple status label for success/warning/info/neutral states.
- `InsightCard`: complex metric card with delta, progress, and action.
- `FeaturePanel`: complex selectable feature panel with metrics and controlled/uncontrolled selection.

## Scripts

Run from the repo root:

```bash
pnpm dev:rn-components
pnpm storybook:rn-components:native
pnpm test:rn-components
pnpm build:rn-components
pnpm lint:rn-components
```

Run inside this app:

```bash
pnpm storybook:web
pnpm storybook:native
pnpm test
pnpm build
pnpm lint
```

## Native Storybook

`pnpm storybook:native` starts Expo with `EXPO_PUBLIC_STORYBOOK_ENABLED=true`, so the app renders Storybook instead of the static component catalog. Open it from Expo Dev Tools, Expo Go, or a dev client on a real iOS or Android device.

If stories are added or removed, regenerate the native story index:

```bash
pnpm storybook:generate
```
