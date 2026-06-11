import type { Meta, StoryObj } from '@storybook/react-native'

import { StatusChip } from '../components'

const meta = {
  args: {
    label: 'Stable',
    value: '98%',
  },
  component: StatusChip,
  title: 'Simple/StatusChip',
} satisfies Meta<typeof StatusChip>

export default meta

type Story = StoryObj<typeof meta>

export const Success: Story = {
  args: {
    tone: 'success',
  },
}

export const Warning: Story = {
  args: {
    label: 'Drift',
    tone: 'warning',
    value: '2.1%',
  },
}

export const Info: Story = {
  args: {
    label: 'Queued',
    tone: 'info',
    value: '7',
  },
}
