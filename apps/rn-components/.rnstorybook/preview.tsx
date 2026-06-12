import type { Preview } from '@storybook/react-native'
import { View } from 'react-native'

const preview: Preview = {
  decorators: [
    (Story) => (
      <View style={{ flex: 1, padding: 18 }}>
        <Story />
      </View>
    ),
  ],
  parameters: {
    backgrounds: {
      default: 'library',
      values: [{ name: 'library', value: '#EEF3EE' }],
    },
  },
}

export default preview
