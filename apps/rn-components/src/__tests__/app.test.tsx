import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'

import App from '../App'

vi.mock('../../.rnstorybook', () => ({
  default: () => <div>Storybook root</div>,
}))

afterEach(cleanup)

test('App renders native Storybook by default', () => {
  render(<App />)

  expect(screen.getByText('Storybook root')).toBeTruthy()
  expect(screen.queryByText('Native component lab')).toBeNull()
})
