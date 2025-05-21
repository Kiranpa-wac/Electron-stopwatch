import fs from 'node:fs'
import { BrowserWindow, ipcMain } from 'electron'
import { formatDateToDefaultFormat, getTimeSlot } from '../Helpers/date_manager'
import { createIdleWindow, idleWindow } from '../index'
import { continueTracking, pauseTracking } from './timer.services'

let mouseStream = null
let keyboardStream = null
let idleTimeStartedOn
let idleTime
let idleTimeEndedOn

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
      global.sharedVariables?.keyboardMovements.push(getCurrentTimeInSeconds())
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
  // console.log('user Activity', userActivity)
}

export const updateTimeSlotWithEndedAt = (userActivity, idleTimeSlot, idleTimeEndedOn) => {
  console.log(userActivity, 'inside function call')

  userActivity = userActivity.slice(0, 1)

  return userActivity.map((activity, index) => {
    console.log(activity, 'inside map')

    if (index === userActivity.length - 1) {
      return { ...activity, event_ended_at: idleTimeEndedOn }
    } else {
      console.log('lop')
      return activity
    }
  })
}

export const checkIdle = () => {
  if (!global.sharedVariables || !global.sharedVariables.isTracking) {
    console.log('Tracking is not active, skip idle check')
    return
  }

  const { mouseMovements, keyboardMovements, startTime } = global.sharedVariables

  console.log('startTime:', startTime)

  global.sharedVariables.lastMouseMovement =
    mouseMovements.length > 0
      ? mouseMovements[mouseMovements.length - 1]
      : global.sharedVariables.lastMouseMovement
  global.sharedVariables.lastKeyboardMovement =
    keyboardMovements.length > 0
      ? keyboardMovements[keyboardMovements.length - 1]
      : global.sharedVariables.lastKeyboardMovement

  // console.log('lastMouseMovement:', global.sharedVariables.lastMouseMovement)
  // console.log('lastKeyboardMovement:', global.sharedVariables.lastKeyboardMovement)

  const lastMouseMovementTime = global.sharedVariables.lastMouseMovement ?? startTime
  const lastKeyboardMovementTime = global.sharedVariables.lastKeyboardMovement ?? startTime

  const idleTimeRef = Math.max(lastMouseMovementTime, lastKeyboardMovementTime)
  console.log('idleTimeRef', idleTimeRef)
  const timeNow = getCurrentTimeInSeconds()
  idleTime = timeNow - idleTimeRef
  const idleTimeRounded = Math.round(idleTime)
  console.log('idle time', idleTimeRounded)

  if (idleTimeRounded >= 600) {
    const idleStart = new Date(idleTimeRef * 1000)

    global.sharedVariables.idleTimeStartedOn = idleStart // ✅ SET HERE
    global.sharedVariables.isIdle = true

    console.log(`User is idle for ${idleTimeRounded} seconds`)
    console.log(`Idle time started on: ${idleStart.toISOString()}`)

    if (!idleWindow) {
      createIdleWindow()
    }
    if (idleWindow) {
      console.log(`Idle time: ${idleTimeRounded} seconds`)
      pauseTracking()
      idleWindow.webContents.on('did-finish-load', () => {
        idleWindow.webContents.send('idletime', { idleTimeRounded })
      })
      idleWindow.webContents.send('idletime', { idleTimeRounded })
    }
  } else {
    global.sharedVariables.isIdle = false
    if (idleWindow) {
      // idleWindow.close(); // Close the idle window if user is no longer idle
    }
  }
}
export const reassignTask = (projectName, taskName) => {
  global.sharedVariables.idleTimeEndedOn = formatDateToDefaultFormat(new Date())
  global.sharedVariables.activeTask = taskName
  const { userActivity, idleTimeStartedOn, idleTimeEndedOn } = global.sharedVariables
  console.log('userActivity', userActivity)
  console.log('starton', formatDateToDefaultFormat(idleTimeStartedOn))

  console.log('end on', idleTimeEndedOn)

  if (!userActivity || !idleTimeStartedOn || !idleTimeEndedOn) {
    console.error('Required variables are not initialized')
    return
  }

  const idleStart = new Date(idleTimeStartedOn)
  const idleEnd = new Date(idleTimeEndedOn)
  const updatedActivity = []

  userActivity.forEach((slot, index) => {
    const start = new Date(slot.starts_at)
    const end = slot.event_ended_at
      ? new Date(slot.event_ended_at)
      : index < userActivity.length - 1
        ? new Date(userActivity[index + 1].starts_at)
        : new Date(Math.ceil(start.getTime() / (10 * 60 * 1000)) * (10 * 60 * 1000))

    // Completely before or after idle period
    if (end <= idleStart || start >= idleEnd) {
      updatedActivity.push({ ...slot, type: 'normal', task_name: taskName })
    } else {
      // Slot starts before idle
      if (start < idleStart && end > idleStart && end <= idleEnd) {
        updatedActivity.push({
          ...slot,
          starts_at: formatDateToDefaultFormat(start),
          event_ended_at: formatDateToDefaultFormat(idleStart),
          type: 'normal',
          mouse_movements: slot.mouse_movements,
          keyboard_movements: slot.keyboard_movements,
          task_name: taskName,
        })
        updatedActivity.push({
          ...slot,
          starts_at: formatDateToDefaultFormat(idleStart),
          event_ended_at: formatDateToDefaultFormat(end),
          type: 'idle',
          mouse_movements: 0,
          keyboard_movements: 0,
          task_name: taskName
        })
      }

      // Fully inside idle period
      else if (start >= idleStart && end <= idleEnd) {
        updatedActivity.push({
          ...slot,
          starts_at: formatDateToDefaultFormat(start),
          event_ended_at: formatDateToDefaultFormat(end),
          type: 'idle',
          mouse_movements: 0,
          keyboard_movements: 0,
          task_name: taskName,
        })
      }

      // Slot starts before idle ends but ends after idle ends
      else if (start >= idleStart && start < idleEnd && end > idleEnd) {
        updatedActivity.push({
          ...slot,
          starts_at: formatDateToDefaultFormat(start),
          event_ended_at: formatDateToDefaultFormat(idleEnd),
          type: 'idle',
          mouse_movements: 0,
          keyboard_movements: 0,
          task_name: taskName,
        })
        updatedActivity.push({
          ...slot,
          starts_at: formatDateToDefaultFormat(idleEnd),
          event_ended_at: formatDateToDefaultFormat(end),
          type: 'normal',
          mouse_movements: slot.mouse_movements,
          keyboard_movements: slot.keyboard_movements,
          task_name: taskName,
        })
      }

      // Slot spans full idle time
      else if (start < idleStart && end > idleEnd) {
        updatedActivity.push({
          ...slot,
          starts_at: formatDateToDefaultFormat(start),
          event_ended_at: formatDateToDefaultFormat(idleStart),
          type: 'normal',
          mouse_movements: slot.mouse_movements,
          keyboard_movements: slot.keyboard_movements,
          task_name: taskName,
        })
        updatedActivity.push({
          ...slot,
          starts_at: formatDateToDefaultFormat(idleStart),
          event_ended_at: formatDateToDefaultFormat(idleEnd),
          type: 'idle',
          mouse_movements: 0,
          keyboard_movements: 0,
          task_name: taskName,
        })
        updatedActivity.push({
          ...slot,
          starts_at: formatDateToDefaultFormat(idleEnd),
          event_ended_at: formatDateToDefaultFormat(end),
          type: 'normal',
          mouse_movements: slot.mouse_movements,
          keyboard_movements: slot.keyboard_movements,
          task_name: taskName
        })
      }
    }
  })

  global.sharedVariables.userActivity = updatedActivity
  console.log('Updated user activity:REASSIGN', global.sharedVariables.userActivity)
}

export const keepIdleTime = () => {
  global.sharedVariables.idleTimeEndedOn = formatDateToDefaultFormat(new Date())

  const { userActivity, idleTimeStartedOn, idleTimeEndedOn } = global.sharedVariables
  console.log('userActivity', userActivity)
  console.log('starton', formatDateToDefaultFormat(idleTimeStartedOn))

  console.log('end on', idleTimeEndedOn)

  if (!userActivity || !idleTimeStartedOn || !idleTimeEndedOn) {
    console.error('Required variables are not initialized')
    return
  }

  const idleStart = new Date(idleTimeStartedOn)
  const idleEnd = new Date(idleTimeEndedOn)
  const updatedActivity = []

  userActivity.forEach((slot, index) => {
    const start = new Date(slot.starts_at)
    const end = slot.event_ended_at
      ? new Date(slot.event_ended_at)
      : index < userActivity.length - 1
        ? new Date(userActivity[index + 1].starts_at)
        : new Date(Math.ceil(start.getTime() / (10 * 60 * 1000)) * (10 * 60 * 1000))

    // Completely before or after idle period
    if (end <= idleStart || start >= idleEnd) {
      updatedActivity.push({ ...slot, type: 'normal' })
    } else {
      // Slot starts before idle
      if (start < idleStart && end > idleStart && end <= idleEnd) {
        updatedActivity.push({
          ...slot,
          starts_at: formatDateToDefaultFormat(start),
          event_ended_at: formatDateToDefaultFormat(idleStart),
          type: 'normal',
          mouse_movements: slot.mouse_movements,
          keyboard_movements: slot.keyboard_movements
        })
        updatedActivity.push({
          ...slot,
          starts_at: formatDateToDefaultFormat(idleStart),
          event_ended_at: formatDateToDefaultFormat(end),
          type: 'idle',
          mouse_movements: 0,
          keyboard_movements: 0
        })
      }

      // Fully inside idle period
      else if (start >= idleStart && end <= idleEnd) {
        updatedActivity.push({
          ...slot,
          starts_at: formatDateToDefaultFormat(start),
          event_ended_at: formatDateToDefaultFormat(end),
          type: 'idle',
          mouse_movements: 0,
          keyboard_movements: 0
        })
      }

      // Slot starts before idle ends but ends after idle ends
      else if (start >= idleStart && start < idleEnd && end > idleEnd) {
        updatedActivity.push({
          ...slot,
          starts_at: formatDateToDefaultFormat(start),
          event_ended_at: formatDateToDefaultFormat(idleEnd),
          type: 'idle',
          mouse_movements: 0,
          keyboard_movements: 0
        })
        updatedActivity.push({
          ...slot,
          starts_at: formatDateToDefaultFormat(idleEnd),
          event_ended_at: formatDateToDefaultFormat(end),
          type: 'normal',
          mouse_movements: slot.mouse_movements,
          keyboard_movements: slot.keyboard_movements
        })
      }

      // Slot spans full idle time
      else if (start < idleStart && end > idleEnd) {
        updatedActivity.push({
          ...slot,
          starts_at: formatDateToDefaultFormat(start),
          event_ended_at: formatDateToDefaultFormat(idleStart),
          type: 'normal',
          mouse_movements: slot.mouse_movements,
          keyboard_movements: slot.keyboard_movements
        })
        updatedActivity.push({
          ...slot,
          starts_at: formatDateToDefaultFormat(idleStart),
          event_ended_at: formatDateToDefaultFormat(idleEnd),
          type: 'idle',
          mouse_movements: 0,
          keyboard_movements: 0
        })
        updatedActivity.push({
          ...slot,
          starts_at: formatDateToDefaultFormat(idleEnd),
          event_ended_at: formatDateToDefaultFormat(end),
          type: 'normal',
          mouse_movements: slot.mouse_movements,
          keyboard_movements: slot.keyboard_movements
        })
      }
    }
  })

  global.sharedVariables.userActivity = updatedActivity
  console.log('Updated user activity:', global.sharedVariables.userActivity)
}

export const handleIdleTime = (skipIdle, reassignData = {}) => {
  idleTimeEndedOn = new Date()
  const { isReassigned = false, projectName, taskName } = reassignData
  if (idleWindow) {
    if (skipIdle) {
      global.sharedVariables.userActivity = updateTimeSlotWithEndedAt(
        global.sharedVariables.userActivity,
        getTimeSlot(idleTimeStartedOn),
        formatDateToDefaultFormat(idleTimeEndedOn)
      )
      global.sharedVariables.userActivity.push({
        time_slot: getTimeSlot(idleTimeEndedOn),
        starts_at: formatDateToDefaultFormat(idleTimeEndedOn),
        mouse_movements: 0,
        keyboard_movements: 0,
        task_name: global.sharedVariables.activeTask || null
      })
    } else if (isReassigned && !skipIdle) {

      reassignTask(projectName, taskName)

    } else {
      keepIdleTime()
      const currentTime = formatDateToDefaultFormat(idleTimeEndedOn)
      global.sharedVariables.userActivity.push({
        time_slot: getTimeSlot(idleTimeEndedOn),
        starts_at: currentTime,
        mouse_movements: 0,
        keyboard_movements: 0,
        task_name: global.sharedVariables.activeTask || null
      })
    }
    idleWindow.close()
  }
}

ipcMain.on('discard-idle-time', () => {
  handleIdleTime(true)
})

ipcMain.on('continue-idle-time', (event, data) => {
  let isReassigned = false
  let projectName
  let taskName

  if (data && data.isReassigned) {
    isReassigned = true
    projectName = data.projectName
    taskName = data.taskName
  }
  console.log('ProjectNAME:', projectName)
  console.log('TaskNAME:', taskName)
  handleIdleTime(false, { isReassigned, projectName, taskName })
})
