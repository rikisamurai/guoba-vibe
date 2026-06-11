import { fireEvent, render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'

import { GBButton } from '../components/gb-button'

test('GBButton renders its label and handles presses', () => {
  const handlePress = vi.fn()

  render(<GBButton label="Create token" onPress={handlePress} />)

  fireEvent.click(screen.getByRole('button', { name: 'Create token' }))

  expect(handlePress).toHaveBeenCalledTimes(1)
})

test('GBButton exposes loading and disabled states', () => {
  render(<GBButton label="Syncing" loading onPress={vi.fn()} />)

  expect(screen.getByText('Syncing')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Syncing' }).getAttribute('aria-disabled')).toBe('true')
})
