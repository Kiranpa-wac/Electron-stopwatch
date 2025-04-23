// import { app, BrowserWindow, ipcMain, Notification, Tray, Menu } from 'electron'
// import * as timerService from './services/timer.services.js'
// import * as activityService from './services/activity.services.js'
// import path from 'node:path'
// import { fileURLToPath } from 'node:url'

// let win = null
// let tray = null

// function createWindow() {
//   win = new BrowserWindow({
//     width: 800,
//     height: 600,
//     autoHideMenuBar: true,
//     webPreferences: {
//       // preload: path.join(__dirname, '../preload/index.js'),
//       preload: fileURLToPath(new URL('../preload/index.js', import.meta.url)),

//       contextIsolation: true,
//       nodeIntegration: false
//     }
//   })

//   win.loadURL('http://localhost:5173/')
// }

// function createTray() {
//   const idleIcon = path.join(__dirname, '../../assets/stopwatch-white.png')
//   const menuTemplate = [
//     { label: 'Show', click: () => win.show() },
//     { label: 'Quit', click: () => app.quit() }
//   ]

//   tray = new Tray(idleIcon)
//   tray.setToolTip('Stopwatch')
//   tray.setContextMenu(Menu.buildFromTemplate(menuTemplate))

//   tray.on('click', () => {
//     win.isVisible() ? win.hide() : win.show()
//   })
// }

// app.whenReady().then(() => {
//   createWindow()
//   createTray()

// })

// app.on('activate', () => {
//   if (BrowserWindow.getAllWindows().length === 0) createWindow()
// })

// app.on('window-all-closed', () => {
//   if (process.platform !== 'darwin') app.quit()
// })

import { app, BrowserWindow, ipcMain, Notification, Tray, Menu } from 'electron'

// import { join } from 'path'
import path from 'node:path'
import * as timerService from './services/timer.services.js'
import * as activityService from './services/activity.services.js'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { fileURLToPath } from 'url'

let tray = null

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: fileURLToPath(new URL('../preload/index.mjs', import.meta.url)),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function createTray() {
  const idleIcon = path.join(__dirname, '../../assets/stopwatch-white.png')
  const menuTemplate = [
    { label: 'Show', click: () => win.show() },
    { label: 'Quit', click: () => app.quit() }
  ]

  tray = new Tray(idleIcon)
  tray.setToolTip('Stopwatch')
  tray.setContextMenu(Menu.buildFromTemplate(menuTemplate))

  tray.on('click', () => {
    win.isVisible() ? win.hide() : win.show()
  })
}



// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()
  createTray()

  ipcMain.on('notify', (_e, { title, body }) => {
    if (Notification.isSupported()) {
      new Notification({ title, body }).show()
    }
  })

  ipcMain.on('timer-start', () => {
    timerService.start()
    activityService.start()
    const activeIcon = path.join(__dirname, '../../assets/stopwatch-red.png')
    tray.setImage(activeIcon)
  })

  ipcMain.on('timer-stop', () => {
    timerService.stop()
    activityService.stop()
    const idleIcon = path.join(__dirname, '../../assets/stopwatch-white.png')
    tray.setImage(idleIcon)
  })

  ipcMain.on('timer-reset', () => {
    timerService.reset()
    activityService.stop()
    const idleIcon = path.join(__dirname, '../../assets/stopwatch-white.png')
    tray.setImage(idleIcon)
  })

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
