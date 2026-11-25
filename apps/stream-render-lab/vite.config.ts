import process from 'node:process'

import mdx from '@mdx-js/rollup'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

import { SERVER_ENV_NAMES } from './api/live-config'
import { devApiPlugin } from './dev-api-plugin'

export default defineConfig(({ mode }) => {
  const loaded = loadEnv(mode, process.cwd(), '')
  const port = Number(process.env.STREAM_RENDER_LAB_PORT ?? 5174)
  for (const name of SERVER_ENV_NAMES) {
    if (process.env[name] === undefined && loaded[name] !== undefined) {
      process.env[name] = loaded[name]
    }
  }
  return {
    plugins: [mdx(), tailwindcss(), react(), devApiPlugin()],
    server: {
      host: '0.0.0.0',
      port,
      strictPort: true,
    },
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
  }
})
