import process from 'node:process'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

import { devApiPlugin } from './dev-api-plugin'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  process.env.DEEPSEEK_API_KEY ??= env.DEEPSEEK_API_KEY
  process.env.KIMI_API_KEY ??= env.KIMI_API_KEY
  return {
    plugins: [tailwindcss(), react(), devApiPlugin()],
    test: {
      environment: 'node',
      include: ['lib/**/*.test.ts', 'api/**/*.test.ts', 'src/**/*.test.ts'],
    },
  }
})
