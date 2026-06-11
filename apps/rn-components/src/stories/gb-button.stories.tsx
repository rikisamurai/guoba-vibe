import type { Meta, StoryObj } from '@storybook/react-native'

import { GBButton } from '../components'

const meta = {
  args: {
    label: 'Create token',
  },
  component: GBButton,
  title: 'Simple/GBButton',
} satisfies Meta<typeof GBButton>

export default meta

type Story = StoryObj<typeof meta>

export const Primary: Story = {}

export const Secondary: Story = {
  args: {
    label: 'Preview change',
    variant: 'secondary',
  },
}

export const Loading: Story = {
  args: {
    label: 'Syncing',
    loading: true,
  },
}

export const Danger: Story = {
  args: {
    label: 'Delete snapshot',
    variant: 'danger',
  },
}
