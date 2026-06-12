import type { Meta, StoryObj } from '@storybook/react-native'

import { FeaturePanel } from '../components'
import { demoFeatures } from './story-data'

const meta = {
  args: {
    features: demoFeatures,
  },
  component: FeaturePanel,
  title: 'Complex/FeaturePanel',
} satisfies Meta<typeof FeaturePanel>

export default meta

type Story = StoryObj<typeof meta>

export const Interactive: Story = {}
