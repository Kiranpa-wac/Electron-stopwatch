// console.log('Initializing global.sharedVariables...');
global.sharedVariables = {
  userActivity: [],
  mouseMovements: [],
  keyboardMovements: [],
  isTracking: false,
  activeTask: null,
  lastMouseMovement: null,
  lastKeyboardMovement: null,
  startTime: null,
  isIdle: false,
}
console.log('global.sharedVariables initialized:', global.sharedVariables)

import { app, BrowserWindow, ipcMain, Notification, Tray, Menu } from 'electron'

// import { join } from 'path'
import path from 'node:path'
import * as timerService from './services/timer.services.js'
import * as activityService from './services/activity.services.js'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { fileURLToPath } from 'url'
import { startActivityStoreCorn, stopActivityStoreCorn } from './services/corn.service.js'
import { giveInputDevicePermissionLinux } from './utils/permissions.js'
import { switchTask } from './services/timer.services.js'
import { startIdleCorn, stopIdleCheckCron } from './services/corn.service.js'

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

function createIdleWindow() {
  if (idleWindow) return; // Prevent multiple idle windows

  idleWindow = new BrowserWindow({
    width: 300,
    height: 150,
    parent: mainWindow,
    modal: true,
    show: false,
    resizable: false,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // Load a simple HTML content for the idle alert
  idleWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Idle Alert</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background-color: #f8d7da;
            color: #721c24;
          }
          .container {
            text-align: center;
            padding: 20px;
            border: 1px solid #f5c6cb;
            border-radius: 5px;
            background-color: #fff;
          }
          h1 {
            font-size: 1.2em;
            margin-bottom: 10px;
          }
          p {
            font-size: 0.9em;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>User Idle</h1>
          <p>You have been idle for 2 minutes.</p>
        </div>
      </body>
    </html>
  `)}`);

  idleWindow.on('ready-to-show', () => {
    idleWindow.show();
  });

  idleWindow.on('closed', () => {
    idleWindow = null;
  });

  return idleWindow;
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

  ipcMain.on('task-selected', (event, taskName) => {
    global.sharedVariables.activeTask = taskName
    switchTask(taskName)
    // if (global.sharedVariables.isTracking && global.sharedVariables.userActivity.length > 0) {
    //   const lastEntry =
    //     global.sharedVariables.userActivity[global.sharedVariables.userActivity.length - 1]
    //   lastEntry.taskName = taskName
    // } else {
    //   console.warn('No active tracking session to store task:', taskName)
    // }
  })

  ipcMain.on('notify', (_e, { title, body }) => {
    if (Notification.isSupported()) {
      new Notification({ title, body }).show()
    }
  })

  ipcMain.on('timer-start', () => {
    timerService.start()
    activityService.start()
    startActivityStoreCorn()
    startIdleCorn()
    const activeIcon = path.join(__dirname, '../../assets/stopwatch-red.png')
    tray.setImage(activeIcon)
  })

  ipcMain.on('timer-stop', () => {
    timerService.stop()
    activityService.stop()
    stopActivityStoreCorn()
    stopIdleCheckCron( )
    const idleIcon = path.join(__dirname, '../../assets/stopwatch-white.png')
    tray.setImage(idleIcon)
  })

  ipcMain.on('timer-reset', () => {
    timerService.reset()
    activityService.stop()
    stopActivityStoreCorn()
    const idleIcon = path.join(__dirname, '../../assets/stopwatch-white.png')
    tray.setImage(idleIcon)
  })
  ipcMain.on('user-idle', () => {
    console.log('User idle event received, creating idle window');
    createIdleWindow();
  });

  if (process.platform === 'linux') {
    giveInputDevicePermissionLinux()
  }

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
