import { BrowserWindow } from 'electron'
import { getTimeSlot, formatDateToDefaultFormat } from '../Helpers/date_manager'
import * as corn from './corn.service'
import { getCurrentTimeInSeconds } from './activity.services'

let timerInterval = null
let elapsed = 0

function emitTick() {
  const win = BrowserWindow.getAllWindows()[0]
  if (win?.webContents) {
    win.webContents.send('timer-tick', elapsed)
  }
}

export const start = () => {
  if (timerInterval) return // don't start a new interval if one already exists

  global.sharedVariables.startTime = getCurrentTimeInSeconds()

  timerInterval = setInterval(() => {
    elapsed++
    emitTick()
  }, 1000)
}

export const pauseTracking = () => {
  if (!timerInterval) return

  clearInterval(timerInterval)
  timerInterval = null // pause without resetting elapsed time
}

export const continueTracking = () => {
  if (timerInterval) return
  start()

  corn.startActivityStoreCron()
  corn.startIdleCorn()

  if (global.sharedVariables) {
    global.sharedVariables.isTracking = true
  }
}

export const stop = () => {
  pauseTracking()

  console.log(global.sharedVariables?.mouseMovements.length, 'before set')
  console.log('Type of mouse movements:', typeof global.sharedVariables?.mouseMovements)

  const mouseMovements = new Set(global.sharedVariables?.mouseMovements)
  const keyboardmovements = [...new Set(global.sharedVariables?.keyboardMovements)]
  console.log('Mouse movements', mouseMovements.size, 'after set')

  const activityLength = global.sharedVariables.userActivity.length

  global.sharedVariables.userActivity = global.sharedVariables.userActivity.map(
    (activity, index) =>
      index === activityLength - 1
        ? {
            ...activity,
            mouse_movements: mouseMovements.size,
            keyboard_movements: keyboardmovements.length,
            event_ended_at: formatDateToDefaultFormat(new Date())
          }
        : activity
  )
  // console.log('User activity', global.sharedVariables.userActivity)
}

export const reset = () => {
  clearInterval(timerInterval)
  timerInterval = null
  elapsed = 0
  emitTick()

  if (global.sharedVariables?.userActivity) {
    global.sharedVariables.userActivity.length = 0
  }
}

export const switchTask = (taskName) => {
  if (global.sharedVariables.isTracking && global.sharedVariables.userActivity.length > 0) {
    const mouseMovements = new Set(global.sharedVariables?.mouseMovements)
    const keyboardmovements = [...new Set(global.sharedVariables?.keyboardMovements)]

    const activityLength = global.sharedVariables.userActivity.length

    global.sharedVariables.userActivity = global.sharedVariables.userActivity.map(
      (activity, index) =>
        index === activityLength - 1
          ? {
              ...activity,
              mouse_movements: mouseMovements.size,
              keyboard_movements: keyboardmovements.size,
              event_ended_at: formatDateToDefaultFormat(new Date())
            }
          : activity
    )
  }
  global.sharedVariables.mouseMovements = []
  global.sharedVariables.keyboardMovements = []

  const timeSlot = getTimeSlot()
  global.sharedVariables.userActivity.push({
    time_slot: timeSlot,
    start_time: formatDateToDefaultFormat(new Date()),
    mouse_movements: 0,
    keyboard_movements: 0,
    task_name: taskName
  })
  // console.log('user activity', global.sharedVariables.userActivity)
}
