import type { Meta, StoryObj } from '@storybook/react-native'
import { useState } from 'react'

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

export const Interactive: Story = {
  render: (args) => {
    const [selectedFeatureId, setSelectedFeatureId] = useState(demoFeatures[0].id)

    return (
      <FeaturePanel
        {...args}
        onSelectFeature={setSelectedFeatureId}
        selectedFeatureId={selectedFeatureId}
      />
    )
  },
}
