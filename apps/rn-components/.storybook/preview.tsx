import type { Preview } from '@storybook/react'
import { View } from 'react-native'

import './preview.css'

const preview: Preview = {
  decorators: [
    (Story) => (
      <View style={{ flex: 1, minHeight: '100%', padding: 32 }}>
        <Story />
      </View>
    ),
  ],
  parameters: {
    controls: {
      expanded: true,
    },
    layout: 'fullscreen',
  },
}

export default preview
