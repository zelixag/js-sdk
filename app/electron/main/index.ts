import path from 'node:path'
import process from 'node:process'
import { app, BrowserWindow, globalShortcut, ipcMain, Menu } from 'electron'

let mainWindow: BrowserWindow | null = null
let walkWindow: BrowserWindow | null = null
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true'

const createMainWindow = () => {
  if (mainWindow) {
    mainWindow.show()
    return
  }
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    webPreferences: {
      preload: path.resolve(__dirname, '../preload/index.mjs'),
      sandbox: false,
    },
  })
  globalShortcut.register('Ctrl+Shift+i', () => {
    mainWindow?.webContents.toggleDevTools()
  })
  if (!app.isPackaged) {
    mainWindow.webContents.loadURL(process.env.ELECTRON_RENDERER_URL as string)
  }
  else {
    mainWindow.webContents.loadFile(path.resolve(__dirname, '../renderer/index.html'))
  }
  mainWindow.on('closed', () => {
    mainWindow = null
    walkWindow?.close()
    walkWindow = null
  })
}

const createWalkWindow =  () => {
  if (walkWindow) {
    walkWindow.show()
    return
  }
  walkWindow = new BrowserWindow({
    width: 360,
    height: 640,
    parent: mainWindow!,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.resolve(__dirname, '../preload/walk.mjs'),
      sandbox: false,
    },
  })
  globalShortcut.register('Ctrl+Shift+j', () => {
    walkWindow?.webContents.toggleDevTools()
  })
  if (!app.isPackaged) {
    walkWindow.webContents.loadURL(process.env.ELECTRON_RENDERER_URL as string)
  }
  else {
    walkWindow.webContents.loadFile(path.resolve(__dirname, '../renderer/index.html'))
  }
  walkWindow.on('closed', () => {
    walkWindow = null
  })
}

// ---------------------ipc---------------------
ipcMain.on('open-walk-window', () => {
  createWalkWindow()
})
ipcMain.on('close-walk-window', () => {
  if (walkWindow) {
    walkWindow.close()
  }
})
ipcMain.on('start-walk-test', () => {
  if (walkWindow) {
    walkWindow.webContents.send('start-walk-test')
  }
})
let originPosition = [0,0]
ipcMain.on('set-character-canvas-offset', (event, data: {offsetX: number; is_first: boolean}) => {
  if (!walkWindow) return
  const { offsetX, is_first } = data
  if (is_first) {
    originPosition = walkWindow.getPosition()
  }
  walkWindow.setPosition(originPosition[0]+offsetX, originPosition[1])
})


// ---------------------app---------------------
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
  process.exit(-1)
}
else {
  app.commandLine.appendSwitch('enable-features', 'GlobalShortcutsPortal')
  app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')

  app.whenReady().then(() => {
    createMainWindow()
  })

  app.on('activate', () => createMainWindow())

  app.on('window-all-closed', () => {
    if (process.platform === 'darwin')
      return
    app.quit()
  })

  app.on('will-quit', () => {
    app.quit()
  })
}
