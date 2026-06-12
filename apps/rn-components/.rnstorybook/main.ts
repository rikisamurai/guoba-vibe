import type { StorybookConfig } from '@storybook/react-native'

const main: StorybookConfig = {
  stories: ['../src/**/*.stories.?(ts|tsx|js|jsx)'],
  deviceAddons: [
    '@storybook/addon-ondevice-actions',
    '@storybook/addon-ondevice-backgrounds',
    '@storybook/addon-ondevice-controls',
  ],
  framework: '@storybook/react-native',
  reactNative: {
    playFn: false,
  },
}

export default main
