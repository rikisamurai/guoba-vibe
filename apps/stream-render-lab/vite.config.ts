import mdx from '@mdx-js/rollup'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

import { devApiPlugin } from './dev-api-plugin'

export default defineConfig(({ mode }) => ({
  plugins: [mdx(), tailwindcss(), react(), devApiPlugin()],
  resolve:
    mode === 'production'
      ? { alias: [{ find: /^react-dom\/client$/, replacement: 'react-dom/profiling' }] }
      : undefined,
  build: {
    rollupOptions: {
      input: {
        app: 'index.html',
        bench: 'bench-frame.html',
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'api/**/*.test.ts'],
  },
}))
