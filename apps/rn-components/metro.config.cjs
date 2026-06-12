const path = require('path')
const { getDefaultConfig } = require('expo/metro-config')
const { withStorybook } = require('@storybook/react-native/metro/withStorybook')

const config = getDefaultConfig(__dirname)
const resolveRequest = config.resolver.resolveRequest
// 固定到本 app 的 node_modules：rn-components 锁 React 19.1.0(Expo SDK 54)，
// 其他 app 是 19.2.4；Metro 跟 pnpm symlink 会从根 .pnpm 解析到另一份 React，
// 同一个 native bundle 混入两份 React → dispatcher 为空 → Invalid hook call。
// 这几个是必须单例的运行时包（hold native/context 状态），勿删。
const singletonModules = [
  'react',
  'react-dom',
  'react-native',
  'react-native-gesture-handler',
  'react-native-reanimated',
  'react-native-safe-area-context',
  'react-native-worklets',
]

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  ...Object.fromEntries(
    singletonModules.map((name) => [name, path.join(__dirname, 'node_modules', name)]),
  ),
}
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (singletonModules.some((name) => moduleName === name || moduleName.startsWith(`${name}/`))) {
    return {
      type: 'sourceFile',
      filePath: require.resolve(moduleName, { paths: [__dirname] }),
    }
  }

  if (resolveRequest) {
    return resolveRequest(context, moduleName, platform)
  }

  return context.resolveRequest(context, moduleName, platform)
}

module.exports = withStorybook(config, {
  configPath: './.rnstorybook',
})
