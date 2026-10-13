import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: { include: ['src/practice/*.practice.ts'], environment: 'node' },
})
