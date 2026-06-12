import type { Meta, StoryObj } from '@storybook/react-native'

import { InsightCard } from '../components'

const meta = {
  args: {
    actionLabel: 'Review',
    delta: '+12%',
    metric: '42k',
    progress: 72,
    subtitle: 'Weekly retained users',
    title: 'Retention',
  },
  component: InsightCard,
  title: 'Complex/InsightCard',
} satisfies Meta<typeof InsightCard>

export default meta

type Story = StoryObj<typeof meta>

export const Retention: Story = {}

export const DeliveryHealth: Story = {
  args: {
    actionLabel: 'Open run',
    delta: '-3%',
    metric: '96.4%',
    progress: 96,
    subtitle: 'Cross-platform parity checks',
    title: 'Delivery health',
  },
}
