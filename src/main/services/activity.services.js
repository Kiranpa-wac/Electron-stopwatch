import fs from 'node:fs'
import { BrowserWindow } from 'electron'

let mouseStream = null
let keyboardStream = null
let secondInterval = null
let minuteInterval = null

let activityThisSecond = false
let activeSeconds = 0

const lastFiveMinutes = []
let idleAlert = false

function recordActivity() {
  activityThisSecond = true
  idleAlert = false
  lastFiveMinutes.length = 0
}

function idleWindow() {
  if (idleAlert) return
  idleAlert = true

  const idleWin = new BrowserWindow({
    width: 300,
    height: 150,
    title: 'Idle Alert',
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true }
  })
  idleWin.loadURL(`data:text/html,
    <body style="display:flex;align-items:center;justify-content:center;font-family:sans-serif">
      <div>You have been idle for more than 5 consecutive minutes.</div>
    </body>`)
}

function onMinuteTick() {
  const percentage = (activeSeconds / 60) * 100
  const win = BrowserWindow.getAllWindows()[0]
  win?.webContents.send('activity-update', percentage.toFixed(2))

  lastFiveMinutes.push(percentage)
  if (lastFiveMinutes.length > 5) lastFiveMinutes.shift()

  if (lastFiveMinutes.length === 5 && lastFiveMinutes.every((v) => v === 0)) {
    idleWindow()
  }

  activeSeconds = 0
}

function onMouseMovement(buffer) {
  if (buffer.some((b, i) => i % 3 !== 0 && b !== 0)) {
    recordActivity()
  }
}

function onKeyboardStroke(buffer) {
  for (let off = 0; off + 23 < buffer.length; off += 24) {
    const type = buffer.readUInt16LE(off + 16)
    const value = buffer.readInt32LE(off + 20)
    if (type === 1 && value > 0) {
      recordActivity()
      break
    }
  }
}

export function start() {
  if (mouseStream || keyboardStream) return

  mouseStream = fs.createReadStream('/dev/input/mice').on('data', onMouseMovement)
  keyboardStream = fs.createReadStream('/dev/input/event3').on('data', onKeyboardStroke)

  activityThisSecond = false
  activeSeconds = 0
  lastFiveMinutes.length = 0
  idleAlert = false

  secondInterval = setInterval(() => {
    if (activityThisSecond) activeSeconds++
    activityThisSecond = false
  }, 1000)

  minuteInterval = setInterval(onMinuteTick, 60_000)
}

export function stop() {
  mouseStream?.destroy()
  mouseStream = null
  keyboardStream?.destroy()
  keyboardStream = null

  clearInterval(secondInterval)
  clearInterval(minuteInterval)
  secondInterval = minuteInterval = null

  activityThisSecond = false
  activeSeconds = 0
  lastFiveMinutes.length = 0
  idleAlert = false
}