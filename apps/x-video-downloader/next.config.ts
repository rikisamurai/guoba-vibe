import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/api/parse': ['./bin/**'],
  },
}

export default nextConfig
