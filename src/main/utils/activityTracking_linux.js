import fs from 'node:fs'
import { getCurrentTimeInSeconds } from '../services/activity.services'

let mouseStream = null
let keyboardStream = null

function onMouseMovement(buffer) {
  global.sharedVariables?.mouseMovements.push(getCurrentTimeInSeconds())
}

function onKeyboardStroke(buffer) {
  for (let i = 0; i + 23 < buffer.length; i += 24) {
    const type = buffer.readUInt16LE(i + 16)
    const value = buffer.readInt32LE(i + 20)
    if (type === 1 && value > 0) {
      global.sharedVariables?.keyboardMovements.push(getCurrentTimeInSeconds())
      break
    }
  }
}

export function startMouseTrackingLinux() {
  try {
    mouseStream = fs.createReadStream('/dev/input/mice').on('data', onMouseMovement)
  } catch (error) {
    console.error(`Failed to start Linux Mouse Tracking: ${error.message}`)
  }
}

export function stopMouseTrackingLinux() {
  mouseStream?.destroy()
  mouseStream = null
}

export function startKeyboardTrackingLinux() {
  try {
    keyboardStream = fs.createReadStream('dev/input/event3').on('data', onKeyboardStroke)
  } catch (error) {
    console.error(`Failed to start Linux Keyboard tracking: ${error.message}`)
  }
}

export function stopKeyboardTrackingLinux() {
  keyboardStream?.destroy()
  keyboardStream = null
}
