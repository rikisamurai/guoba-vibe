import { fireEvent, render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'

import { InsightCard } from '../components/insight-card'

test('InsightCard presents metric content and action callback', () => {
  const onActionPress = vi.fn()
  render(
    <InsightCard
      actionLabel="Review"
      delta="+12%"
      metric="42k"
      onActionPress={onActionPress}
      progress={72}
      subtitle="Weekly retained users"
      title="Retention"
    />,
  )

  expect(screen.getByText('Retention')).toBeTruthy()
  expect(screen.getByText('42k')).toBeTruthy()
  expect(screen.getByLabelText('Retention progress').getAttribute('aria-valuenow')).toBe('72')

  fireEvent.click(screen.getByRole('button', { name: 'Review' }))
  expect(onActionPress).toHaveBeenCalledTimes(1)
})
