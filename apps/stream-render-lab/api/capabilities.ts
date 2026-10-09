import process from 'node:process'

import { CAPABILITY_VERIFIED_AT, DEFAULT_MODEL, PROTOCOL_CAPABILITIES } from './capability-data'
import { resolveLiveConfig } from './live-config'

export function GET(): Response {
  const config = resolveLiveConfig(process.env)
  return Response.json(
    {
      capability: config.capability,
      defaultModel: DEFAULT_MODEL,
      verifiedAt: CAPABILITY_VERIFIED_AT,
      protocols: PROTOCOL_CAPABILITIES,
    },
    { headers: { 'cache-control': 'no-store' } },
  )
}
