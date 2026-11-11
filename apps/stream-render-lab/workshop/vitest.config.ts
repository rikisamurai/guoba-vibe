import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

const appRoot = fileURLToPath(new URL('..', import.meta.url))
const requested = process.env.LESSON_TARGET

export default defineConfig({
  root: appRoot,
  test: {
    environment: 'node',
    include: [requested ?? 'workshop/**/solution/*.test.ts'],
  },
})
