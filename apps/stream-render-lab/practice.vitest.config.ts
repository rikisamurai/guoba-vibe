import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/practice/*.practice.ts', 'src/practice/*.measure.ts'],
    environment: 'node',
  },
})
