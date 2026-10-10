import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'

import { findProjectRoot, getManagerRoots } from '../core/paths'
import { SkillManager } from '../core/skill-manager'
import { ServiceController } from '../service/controller'
import { isServiceAction } from '../shared/types'

let window: BrowserWindow | undefined
let projectRoot: string | undefined
let controller: ServiceController

async function createWindow(): Promise<void> {
  projectRoot = process.env.GUOBA_SKILLS_PROJECT_ROOT ?? (await readRecentProject())
  if (!projectRoot && !app.isPackaged) projectRoot = await findProjectRoot()
  resetController()
  window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1040,
    minHeight: 680,
    backgroundColor: '#0b0c0b',
    title: 'Guoba Skills',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 18, y: 18 },
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url)
    return { action: 'deny' }
  })
  window.webContents.on('will-navigate', (event, url) => {
    if (isTrustedRendererUrl(url)) return
    event.preventDefault()
    if (url.startsWith('https://')) void shell.openExternal(url)
  })
  window.on('closed', () => {
    void controller.dispose()
    window = undefined
  })
  if (process.env.ELECTRON_RENDERER_URL) await window.loadURL(process.env.ELECTRON_RENDERER_URL)
  else await window.loadFile(join(__dirname, '../renderer/index.html'))
}

async function chooseProject(): Promise<unknown> {
  if (!window) throw new Error('The app window is not ready.')
  const result = await dialog.showOpenDialog(window, {
    title: 'Open a repository',
    properties: ['openDirectory'],
  })
  if (result.canceled || !result.filePaths[0]) return controller.invoke('inventory')
  projectRoot = result.filePaths[0]
  await writeFile(recentProjectPath(), JSON.stringify({ projectRoot }, null, 2), 'utf8')
  resetController()
  return controller.invoke('inventory')
}

function resetController(): void {
  controller = new ServiceController(
    new SkillManager(getManagerRoots(projectRoot, process.env.GUOBA_SKILLS_HOME)),
  )
}

function recentProjectPath(): string {
  return join(app.getPath('userData'), 'preferences.json')
}

async function readRecentProject(): Promise<string | undefined> {
  try {
    const parsed: unknown = JSON.parse(await readFile(recentProjectPath(), 'utf8'))
    if (typeof parsed !== 'object' || parsed === null) return undefined
    const value: unknown = Reflect.get(parsed, 'projectRoot')
    return typeof value === 'string' ? value : undefined
  } catch {
    return undefined
  }
}

ipcMain.handle('guoba-skills:invoke', (event, action: unknown, payload?: unknown) => {
  if (
    !window ||
    event.sender !== window.webContents ||
    !event.senderFrame ||
    !isTrustedRendererUrl(event.senderFrame.url)
  ) {
    throw new Error('Untrusted renderer cannot invoke Guoba Skills.')
  }
  if (!isServiceAction(action)) throw new Error('Unknown service action.')
  if (action === 'chooseProject') return chooseProject()
  return controller.invoke(action, payload)
})

function isTrustedRendererUrl(url: string): boolean {
  const developmentUrl = process.env.ELECTRON_RENDERER_URL
  if (developmentUrl) return new URL(url).origin === new URL(developmentUrl).origin
  return url === pathToFileURL(join(__dirname, '../renderer/index.html')).toString()
}

async function bootstrap(): Promise<void> {
  await app.whenReady()
  await createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow()
  })
}

void bootstrap()

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' || process.env.GUOBA_SKILLS_E2E) app.quit()
})
