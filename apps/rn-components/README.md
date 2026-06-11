# rn-components

React Native 组件库工作区,涵盖简单与复杂的跨平台组件,配套 web Storybook(PC 浏览器)、
on-device Storybook(真机 iOS / Android)以及组件级回归测试。

基于 Expo SDK 54 / React Native 0.81。应用以 Expo **development build**(`expo-dev-client`)
方式运行,因此 Reanimated、Gesture Handler、Bottom Sheet 等依赖原生能力的库可以完整还原真机
表现,SDK 也不再被 Expo Go 锁版本。

## 包含什么

- 可复用组件在 `src/components`。
- **Web Storybook** 在 `.storybook`,通过 `@storybook/react-native-web-vite`(借助 `react-native-web` 在 PC 浏览器渲染)。
- **On-device Storybook** 在 `.rnstorybook`,通过 `@storybook/react-native`(真机 iOS / Android 或模拟器)。
- **回归测试** 在 `src/__tests__`,用 Vitest + `react-native-web` 作为渲染器。

## 组件

- `GBButton`:简单按钮原语,支持变体、loading、disabled 状态和点击回调。
- `StatusChip`:简单状态标签,用于 success/warning/info/neutral。
- `InsightCard`:复杂指标卡片,含 delta、进度条和操作按钮。
- `FeaturePanel`:复杂的可选择功能面板,带指标和受控/非受控选择。

## 开发流程

同一套 stories 有两个载体:日常用 web 快速迭代,需要真机保真时用 native 构建。

### 1. Web Storybook —— 日常开发(快)

```bash
pnpm dev:rn-components          # 仓库根目录 → http://localhost:6006
# 或在本 app 内:
pnpm storybook:web
```

Vite HMR 让它成为最快的循环 —— 最适合搭建和打磨组件结构、props、布局。它通过
`react-native-web` 渲染,对纯 `View` / `Text` / `Pressable` + flexbox 是高保真投影,
但**不等于**真机(见下方校准说明)。

### 2. Native 预览 —— development build(真机 / 模拟器)

原生 app 是 Expo **development build**(不是 Expo Go),会打包进你真实的原生模块,给出真机行为。

首次构建(生成 `ios/` + `android/`、编译、安装):

```bash
pnpm ios:rn-components          # expo run:ios     → iOS 模拟器(或真机)
pnpm android:rn-components      # expo run:android → Android 模拟器(或真机)
```

首次构建的前置条件:

- **iOS**:Xcode 版本要匹配 SDK(SDK 54 → Xcode 26.x),且**装好 iOS 平台 / 模拟器 runtime**
  (Xcode → Settings → Components,或 `xcodebuild -downloadPlatform iOS`)。否则 `xcodebuild`
  看不到任何模拟器目标。
- `expo-dev-client` 已是依赖。`ios/` 和 `android/` 按需生成(CNG)且已 git-ignore ——
  改了 `app.json` 里的原生配置后,重跑 `expo prebuild --clean` 重新生成。

dev build 装好后,改 JS 会热更新;只有改动原生依赖或原生配置时才需要重跑 `pnpm ios`/`android`。

### 3. On-device Storybook

```bash
pnpm storybook:rn-components:native   # 仓库根目录
# 或在本 app 内:
pnpm storybook:native
```

它会以 `STORYBOOK_ENABLED=true` 启动 Metro,于是 dev build 渲染 Storybook 界面而非静态目录。
在模拟器或真机上打开 dev build,它会自动连上;用屏幕底部的 `☰` 菜单浏览 stories。

### 校准说明(web vs native)

把 web 循环当成提速器,真机当成事实标准:

- 纯布局/逻辑组件(`View`/`Text`/`Pressable` + 样式)在 web 上高度一致 —— 真机抽查即可。
- 阴影、字体,以及任何用到动画 / 手势 / 原生模块 / 平台分叉的东西,web 和真机会有差异。
  尤其 `theme.ts` 的阴影在 web 和 iOS 走 CSS box-shadow,而 Android 走 `elevation` ——
  **这些务必在真实 Android 目标上验证**。

## 脚本速查

| 命令(仓库根)                          | 本 app 内               | 作用                         |
| ------------------------------------- | ----------------------- | ---------------------------- |
| `pnpm dev:rn-components`              | `pnpm storybook:web`    | Web Storybook(浏览器)        |
| `pnpm storybook:rn-components:native` | `pnpm storybook:native` | On-device Storybook(Metro)   |
| `pnpm ios:rn-components`              | `pnpm ios`              | 构建并运行 iOS dev build     |
| `pnpm android:rn-components`          | `pnpm android`          | 构建并运行 Android dev build |
| `pnpm test:rn-components`             | `pnpm test`             | Vitest 回归测试              |
| `pnpm build:rn-components`            | `pnpm build`            | TypeScript no-emit 校验      |
| `pnpm lint:rn-components`             | `pnpm lint`             | oxlint                       |

## 维护 On-device Storybook

原生 story 索引在 `.rnstorybook/storybook.requires.ts`。增删 story 文件后,重新生成:

```bash
pnpm storybook:generate
```

## 测试

组件回归测试用 Vitest + React Testing Library,以 `react-native-web` 作为渲染器。测试放在
`src/__tests__`;优先做行为断言 —— 渲染文本、无障碍 role、disabled 状态、点击回调。
