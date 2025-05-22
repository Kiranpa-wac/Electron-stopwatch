import fs from 'node:fs'
import { getCurrentTimeInSeconds } from '../services/activity.services'
import { getInputDevicePath } from '../Helpers/getInputPorts'
import { spawn } from 'node:child_process'

let mouseStream = null
let keyBoardDetectionLinux = null
const triggerCommand = 'cat'

function onMouseMovement(buffer) {
  global.sharedVariables?.mouseMovements.push(getCurrentTimeInSeconds())
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
  const keyboardArgs = getInputDevicePath()
  const args = [keyboardArgs]
  global.sharedVariables.keyboardMovements.push(getCurrentTimeInSeconds())
  keyBoardDetectionLinux = spawn(triggerCommand, args)

  keyBoardDetectionLinux.stdout.on('data', (data) => {
    if (data && !global.sharedVariables.isIdle) {
      global.sharedVariables.keyboardMovements.push(getCurrentTimeInSeconds())
    }
  })

  keyBoardDetectionLinux.stderr.on('data', () => {})

  keyBoardDetectionLinux.on('close', () => {})
}

export function stopKeyboardTrackingLinux() {
  if (keyBoardDetectionLinux) {
    keyBoardDetectionLinux.kill()
    keyBoardDetectionLinux.on('close', () => {})
    keyBoardDetectionLinux = null
  }
}
