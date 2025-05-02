// src/main/services/activity.services.js
import fs from 'node:fs'
import { BrowserWindow } from 'electron'

let mouseStream = null
let keyStream   = null
let secondInterval = null
let minuteInterval = null

let sawActivityThisSecond = false
let activeSeconds = 0

const lastFive = []
let idleAlertShown = false   // ← guard to avoid dup windows

function emitUpdate(pct) {
  const win = BrowserWindow.getAllWindows()[0]
  win?.webContents.send('activity-update', pct.toFixed(2))
}

function emitIdleAlert() {
  if (idleAlertShown) return               // ← only once per idle session
  idleAlertShown = true

  const idleWin = new BrowserWindow({
    width: 300, height: 150, title: 'Idle Alert',
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true }
  })
  idleWin.loadURL(`data:text/html,
    <body style="display:flex;align-items:center;justify-content:center;font-family:sans-serif">
      <div>You have been idle for more than 5 consecutive minutes.</div>
    </body>`)
}

function onMinuteTick() {
  const pct = (activeSeconds / 60) * 100
  emitUpdate(pct)

  lastFive.push(pct)
  if (lastFive.length > 5) lastFive.shift()

  // If 5 slots, all zero and we haven't shown the alert
  if (lastFive.length === 5 && lastFive.every(v => v === 0)) {
    emitIdleAlert()
  }

  // Reset for next minute
  activeSeconds = 0
}

function onMouseData(buf) {
  if (buf.some((b, i) => i % 3 !== 0 && b !== 0)) {
    sawActivityThisSecond = true
    idleAlertShown = false     // ← any activity resets the idle guard
    lastFive.length = 0        // optional: clear buffer on activity
  }
}

function onKeyData(chunk) {
  for (let off = 0; off + 23 < chunk.length; off += 24) {
    const type  = chunk.readUInt16LE(off + 16)
    const value = chunk.readInt32LE(off + 20)
    if (type === 1 && value > 0) {
      sawActivityThisSecond = true
      idleAlertShown = false   // reset guard on key activity
      lastFive.length = 0
      break
    }
  }
}

export function start() {
  if (mouseStream || keyStream) return

  mouseStream = fs.createReadStream('/dev/input/mice').on('data', onMouseData)
  keyStream   = fs.createReadStream('/dev/input/event3').on('data', onKeyData)

  sawActivityThisSecond = false
  activeSeconds = 0
  lastFive.length = 0
  idleAlertShown = false

  secondInterval = setInterval(() => {
    if (sawActivityThisSecond) activeSeconds++
    sawActivityThisSecond = false
  }, 1000)

  minuteInterval = setInterval(onMinuteTick, 60_000)
}

export function stop() {
  mouseStream?.destroy(); mouseStream = null
  keyStream?.destroy();   keyStream   = null

  clearInterval(secondInterval)
  clearInterval(minuteInterval)
  secondInterval = minuteInterval = null

  sawActivityThisSecond = false
  activeSeconds = 0
  lastFive.length = 0
  idleAlertShown = false
}
