import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/api/parse': ['./node_modules/youtube-dl-exec/bin/**'],
  },
}

export default nextConfig
