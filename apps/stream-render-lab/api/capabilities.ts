import process from 'node:process'

import { CAPABILITY_VERIFIED_AT, DEFAULT_MODEL, PROTOCOL_CAPABILITIES } from './capability-data'

export function GET(): Response {
  return Response.json(
    {
      liveEnabled: process.env.ENABLE_LIVE_API === '1' && Boolean(process.env.DEEPSEEK_API_KEY),
      defaultModel: DEFAULT_MODEL,
      verifiedAt: CAPABILITY_VERIFIED_AT,
      protocols: PROTOCOL_CAPABILITIES,
    },
    { headers: { 'cache-control': 'no-store' } },
  )
}
