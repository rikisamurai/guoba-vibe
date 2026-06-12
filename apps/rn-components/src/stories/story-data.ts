import type { FeaturePanelItem } from '../components'

export const demoFeatures: FeaturePanelItem[] = [
  {
    description: 'Collect native interaction snapshots before a release leaves the component lab.',
    id: 'capture',
    metrics: [
      { label: 'Stories', value: '12' },
      { label: 'Runs', value: '248' },
    ],
    title: 'Capture',
    tone: 'mint',
  },
  {
    description: 'Compare component states across releases and surface visual drift early.',
    id: 'audit',
    metrics: [
      { label: 'Checks', value: '32' },
      { label: 'Drift', value: '0.4%' },
    ],
    title: 'Audit',
    tone: 'amber',
  },
  {
    description: 'Package stable cross-platform primitives for product teams to consume.',
    id: 'ship',
    metrics: [
      { label: 'Tokens', value: '18' },
      { label: 'Targets', value: '3' },
    ],
    title: 'Ship',
    tone: 'blue',
  },
]
