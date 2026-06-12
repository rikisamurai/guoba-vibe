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

同一套 stories 有两个载体:日常用 web 快速迭代,需要真机保真时先安装 native dev
build。native dev build 默认渲染 Storybook,没有额外的普通预览 fallback。

### 1. Web Storybook —— 日常开发(快)

```bash
pnpm dev:web   # http://localhost:6006
```

Vite HMR 让它成为最快的循环 —— 最适合搭建和打磨组件结构、props、布局。它通过
`react-native-web` 渲染,对纯 `View` / `Text` / `Pressable` + flexbox 是高保真投影,
但**不等于**真机(见下方校准说明)。

### 2. Native 首次构建 —— development build(真机 / 模拟器)

原生 app 是 Expo **development build**(不是 Expo Go),会打包进你真实的原生模块,给出真机行为。

首次开发必须先跑一次 `expo run:*`,用来生成、编译并安装 dev build。之后只有改了原生依赖或原生配置时,
才需要重新跑这些命令:

```bash
pnpm run:ios          # expo run:ios          → iOS 模拟器
pnpm run:ios-device   # expo run:ios --device → iOS 真机
pnpm run:android      # expo run:android      → Android 设备 / 模拟器
```

首次构建的前置条件:

- **iOS**:Xcode 版本要匹配 SDK(SDK 54 → Xcode 26.x),且**装好 iOS 平台 / 模拟器 runtime**
  (Xcode → Settings → Components,或 `xcodebuild -downloadPlatform iOS`)。否则 `xcodebuild`
  看不到任何模拟器目标。
- `expo-dev-client` 已是依赖。`ios/` 和 `android/` 按需生成(CNG)且已 git-ignore ——
  改了 `app.json` 里的原生配置后,重跑 `expo prebuild --clean` 重新生成。

dev build 装好后,打开 app 就是 Storybook;改 JS 会热更新。日常开发不要反复跑
`pnpm run:ios` / `pnpm run:ios-device` / `pnpm run:android`,直接进入下一步用 `start:*`。

### 3. Native 日常开发 —— 启动 Metro

dev build 已经装好后,Storybook 只需要启动 Metro,所以这里用 `expo start`,不是 `expo run`。
后续 native 开发主要用这两个命令:

```bash
pnpm start:ios       # expo start --ios     → 启动 Metro,并打开 iOS Simulator
pnpm start:android   # expo start --android → 启动 Metro,并打开 Android 设备 / 模拟器
```

如果只想启动 Metro,再自己扫码或手动打开已安装的 dev build,用 `pnpm dev`。

也就是说,`expo run:*` 负责安装原生壳,`expo start` 负责给已安装的 dev build 提供 Storybook
JS bundle。用屏幕底部的 `☰` 菜单浏览 stories。

### 校准说明(web vs native)

把 web 循环当成提速器,真机当成事实标准:

- 纯布局/逻辑组件(`View`/`Text`/`Pressable` + 样式)在 web 上高度一致 —— 真机抽查即可。
- 阴影、字体,以及任何用到动画 / 手势 / 原生模块 / 平台分叉的东西,web 和真机会有差异。
  尤其 `theme.ts` 的阴影在 web 和 iOS 走 CSS box-shadow,而 Android 走 `elevation` ——
  **这些务必在真实 Android 目标上验证**。

## 脚本速查

| 命令                  | 作用                              |
| --------------------- | --------------------------------- |
| `pnpm dev:web`        | Web Storybook(浏览器)             |
| `pnpm build:web`      | 构建 Web Storybook                |
| `pnpm dev`            | 启动 Storybook Metro              |
| `pnpm run:ios`        | 首次构建并运行 iOS dev build      |
| `pnpm run:ios-device` | 首次构建并运行 iOS 真机 dev build |
| `pnpm run:android`    | 首次构建并运行 Android dev build  |
| `pnpm start:ios`      | 启动 Storybook Metro + iOS        |
| `pnpm start:android`  | 启动 Storybook Metro + Android    |
| `pnpm test`           | Vitest 回归测试                   |
| `pnpm build`          | TypeScript no-emit 校验           |
| `pnpm lint`           | oxlint                            |

## 测试

组件回归测试用 Vitest + React Testing Library,以 `react-native-web` 作为渲染器。测试放在
`src/__tests__`;优先做行为断言 —— 渲染文本、无障碍 role、disabled 状态、点击回调。
