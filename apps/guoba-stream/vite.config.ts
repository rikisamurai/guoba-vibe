import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [tailwindcss(), react()],
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts', 'api/**/*.test.ts', 'src/**/*.test.ts'],
  },
})
