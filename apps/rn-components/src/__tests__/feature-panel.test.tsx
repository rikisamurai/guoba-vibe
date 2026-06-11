import { fireEvent, render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'

import { FeaturePanel } from '../components/feature-panel'

const features = [
  {
    id: 'capture',
    title: 'Capture',
    description: 'Collect native interaction snapshots.',
    tone: 'mint',
    metrics: [
      { label: 'Stories', value: '12' },
      { label: 'Runs', value: '248' },
    ],
  },
  {
    id: 'audit',
    title: 'Audit',
    description: 'Compare component states across releases.',
    tone: 'amber',
    metrics: [
      { label: 'Checks', value: '32' },
      { label: 'Drift', value: '0.4%' },
    ],
  },
] as const

test('FeaturePanel switches the selected feature and reports the selected id', () => {
  const onSelect = vi.fn()
  render(<FeaturePanel features={features} onSelectFeature={onSelect} />)

  expect(screen.getByText('Collect native interaction snapshots.')).toBeTruthy()

  fireEvent.click(screen.getByRole('button', { name: 'Audit' }))

  expect(screen.getByText('Compare component states across releases.')).toBeTruthy()
  expect(screen.getByText('Drift')).toBeTruthy()
  expect(onSelect).toHaveBeenCalledWith('audit')
})
