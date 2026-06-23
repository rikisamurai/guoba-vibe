const testGlobal = globalThis as typeof globalThis & {
  jsdom?: { window: Window }
}

const jsdomWindow = testGlobal.jsdom?.window

if (jsdomWindow) {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: jsdomWindow.localStorage,
  })

  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    value: jsdomWindow.sessionStorage,
  })
}
