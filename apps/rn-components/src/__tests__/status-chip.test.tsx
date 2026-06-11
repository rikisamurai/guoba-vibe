import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'

import { StatusChip } from '../components/status-chip'

test('StatusChip renders a labeled status value', () => {
  render(<StatusChip label="Stable" tone="success" value="98%" />)

  expect(screen.getByText('Stable')).toBeTruthy()
  expect(screen.getByText('98%')).toBeTruthy()
})
