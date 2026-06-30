import type { EnvironmentProfile } from './lib/deep-link-lab'

export const profiles: EnvironmentProfile[] = [
  { id: 'prod', name: 'Production', params: { env: 'prod', source: 'qr' } },
  { id: 'staging', name: 'Staging', params: { env: 'staging', source: 'lab' } },
  { id: 'preview', name: 'Preview', params: { env: 'preview', source: 'lab' } },
]

export const initialUrl = 'xhsdiscover://item/detail?id=42&env=prod'
