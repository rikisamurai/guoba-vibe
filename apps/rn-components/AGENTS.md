# apps/rn-components

React Native component library workspace with web Storybook, native Expo Storybook, and component-level regression tests.

## Development

- Component source lives in `src/components`.
- Storybook stories live in `src/stories` and should run in both web and native Storybook.
- Keep examples small but real; add one story per meaningful state.
- Native Storybook uses `.rnstorybook/storybook.requires.ts`; Storybook's Metro wrapper updates it when Metro runs.

## Testing

- Component regression tests use Vitest plus React Testing Library with `react-native-web`.
- Add tests under `src/__tests__`.
- Prefer behavior assertions: rendered text, accessibility roles, disabled state, and press callbacks.

## Verification

- Run `pnpm --filter rn-components test` after component behavior changes.
- Run `pnpm --filter rn-components build` after TypeScript, export, Storybook, or app entry changes.
- Run `pnpm --filter rn-components lint` before completion.
- For visual Storybook changes, start `pnpm --filter rn-components storybook:web` and verify the local browser at `http://localhost:6006`.
