import fs from 'node:fs'
import { BrowserWindow, ipcMain } from 'electron'
import { formatDateToDefaultFormat, getTimeSlot } from '../Helpers/date_manager'

let mouseStream = null
let keyboardStream = null
let idleTimeStartedOn
let idleTime
let idleCheckInterval = null

let activityThisSecond = false
let activeSeconds = 0
export const getCurrentTimeInSeconds = () => {
  return Math.floor(new Date().getTime() / 1000)
}

function onMouseMovement(buffer) {
  global.sharedVariables?.mouseMovements.push(getCurrentTimeInSeconds())
}

function onKeyboardStroke(buffer) {
  for (let i = 0; i + 23 < buffer.length; i += 24) {
    const type = buffer.readUInt16LE(i + 16)
    const value = buffer.readInt32LE(i + 20)
    if (type === 1 && value > 0) {
      global.sharedVariables?.keyboardMovements.push(Date.now())
      break
    }
  }
}

export function start() {
  if (!global.sharedVariables) {
    console.error('global.sharedVariables is not initialized')
    return
  }
  if (mouseStream || keyboardStream) return

  try {
    mouseStream = fs.createReadStream('/dev/input/mice').on('data', onMouseMovement)
    keyboardStream = fs.createReadStream('/dev/input/event3').on('data', onKeyboardStroke)
  } catch (error) {
    console.error(`Failed to access input devices: ${error.message}`)
    console.log('Falling back to mock tracking for testing...')
    startMockTracking()
  }

  global.sharedVariables.isTracking = true

  // Initialize first placeholder
  const timeSlot = getTimeSlot()
  const currentTime = formatDateToDefaultFormat(new Date())
  global.sharedVariables.userActivity.push({
    time_slot: timeSlot,
    starts_at: currentTime,
    mouse_movements: 0,
    keyboard_movements: 0,
    task_name: global.sharedVariables.activeTask || null
  })
  // console.log("user activity",global.sharedVariables.userActivity);
}

export function stop() {
  if (global.sharedVariables?.userActivity && global.sharedVariables?.userActivity.length > 0) {
    const lastEntry =
      global.sharedVariables.userActivity[global.sharedVariables.userActivity.length - 1]
    const mouseMovementsUnique = [...new Set(global.sharedVariables.mouseMovements)]
    const keyboardMovementsUnique = [...new Set(global.sharedVariables.keyboardMovements)]
    lastEntry.mouse_movements = mouseMovementsUnique.length
    lastEntry.keyboard_movements = keyboardMovementsUnique.length
  }

  mouseStream?.destroy()
  mouseStream = null
  keyboardStream?.destroy()
  keyboardStream = null

  if (global.sharedVariables) {
    global.sharedVariables.isTracking = false
    global.sharedVariables.mouseMovements.length = 0
    global.sharedVariables.keyboardMovements.length = 0
  }
}

export const trackActivity = () => {
  if (!global.sharedVariables || !global.sharedVariables.isTracking) {
    console.error('global.sharedVariables is not initialized or tracking is not started')
    return
  }
  const { mouseMovements, keyboardMovements, userActivity, activeTask } = global.sharedVariables
  if (!userActivity || userActivity.length === 0) {
    console.error('userActivity is not initialized or empty')
    return
  }

  const mouseMovementsUnique = [...new Set(mouseMovements)]
  const keyboardMovementsUnique = [...new Set(keyboardMovements)]
  const mouseMovementsLength = mouseMovementsUnique.length
  const keyboardMovementsLength = keyboardMovementsUnique.length

  userActivity[userActivity.length - 1] = {
    ...userActivity[userActivity.length - 1],
    mouse_movements: mouseMovementsLength,
    keyboard_movements: keyboardMovementsLength
  }

  mouseMovements.length = 0
  keyboardMovements.length = 0

  const nextTimeSlot = getTimeSlot(new Date(Date.now()))
  userActivity.push({
    time_slot: nextTimeSlot,
    starts_at: nextTimeSlot,
    mouse_movements: 0,
    keyboard_movements: 0,
    task_name: activeTask || null
  })
  console.log('user Activity', userActivity)
}

export const checkIdle = () => {
  if (!global.sharedVariables || !global.sharedVariables.isTracking) {
    console.log('Tracking is not active, skip idle check');
    return;
  }

  const { mouseMovements, keyboardMovements, startTime } = global.sharedVariables;

  global.sharedVariables.lastMouseMovement = mouseMovements.length > 0 ? mouseMovements[mouseMovements.length - 1] : global.sharedVariables.lastMouseMovement;
  global.sharedVariables.lastKeyboardMovement = keyboardMovements.length > 0 ? keyboardMovements[keyboardMovements.length - 1] : global.sharedVariables.lastKeyboardMovement;

  const lastMouseMovementTime = global.sharedVariables.lastMouseMovement ?? startTime;
  const lastKeyboardMovementTime = global.sharedVariables.lastKeyboardMovement ?? startTime;

  if (lastMouseMovementTime === null && lastKeyboardMovementTime === null && startTime === null) {
    console.log('No activity and no startTime, cannot determine idle time');
    return;
  }

  const idleTimeRef = Math.max(lastMouseMovementTime ?? 0, lastKeyboardMovementTime ?? 0);

  const timeNow = getCurrentTimeInSeconds();
  idleTime = timeNow - idleTimeRef;

  const idleTimeRounded = Math.round(idleTime);
  console.log(`Idle time: ${idleTimeRounded} seconds`);

  if (idleTimeRounded >= 120) {
    console.log('User is idle for', idleTimeRounded, 'seconds');
    idleTimeStartedOn = new Date(idleTimeRef * 1000);
    console.log(`Idle time started on: ${idleTimeStartedOn.toISOString()}`);
    global.sharedVariables.isIdle = true; 
    ipcMain.emit('user-idle');
  } else {
    global.sharedVariables.isIdle = false;
  }
};

