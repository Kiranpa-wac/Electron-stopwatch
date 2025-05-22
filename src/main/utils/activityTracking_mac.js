import { app } from 'electron'
import { spawn } from 'child_process'
import path from 'node:path'
import fs from 'node:fs'
import { getCurrentTimeInSeconds } from '../services/activity.services'

let mouseDetectionMac = null
let keyboardDetectionMac = null
const isPackaged = app.isPackaged

export function startMouseTrackingMac() {
  let exePath
  if (isPackaged) {
    exePath = path.join(process.resourcesPath, 'mousemac')
  } else {
    exePath = './resources/mousemac'
  }

  if (!fs.existsSync(exePath)) {
    console.log(`Mouse tracking file not found at ${exePath}`)
  }

  mouseDetectionMac = spawn(exePath)

  mouseDetectionMac.stdout.on('data', (data) => {
    if (data && !global.sharedVariables.isIdle) {
      global.sharedVariables.mouseMovements.push(getCurrentTimeInSeconds())
    }
    // console.log('mac mouse movements:', global.sharedVariables.mouseMovements)
  })

  mouseDetectionMac.stderr.on('data', (data) => {
    console.error(`stderr from mousemac: ${data}`)
  })

  mouseDetectionMac.on('close', (code) => {
    console.log(`mousemac process exited with code ${code}`)
  })
}

export function stopMouseTrackingMac() {
  if (mouseDetectionMac) {
    mouseDetectionMac.kill()
    mouseDetectionMac = null
  }
}

export function startKeyboardTrackingMac() {
  let exePath
  if (isPackaged) {
    exePath = path.join(process.resourcesPath, 'keyboardmac')
  } else {
    exePath = './resources/keyboardmac'
  }

  if (!fs.existsSync(exePath)) {
    console.log('Keyboard tracking file not found')
    return
  }

  keyboardDetectionMac = spawn(exePath)

  keyboardDetectionMac.stdout.on('data', (data) => {
    if (data && !global.sharedVariables.isIdle) {
      global.sharedVariables.keyboardMovements.push(getCurrentTimeInSeconds())
    }
    console.log('mac keyboard movements:', global.sharedVariables.keyboardMovements)
  })

  keyboardDetectionMac.stderr.on('data', () => {})

  keyboardDetectionMac.on('close', () => {})
}

export function stopKeyboardTrackingMac() {
  if (!keyboardDetectionMac) return
  keyboardDetectionMac?.kill()

  keyboardDetectionMac.on('exit', () => {})
  keyboardDetectionMac = null
}
