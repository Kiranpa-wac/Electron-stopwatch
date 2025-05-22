import corn from 'node-cron'
import { checkIdle } from './activity.services'
import { trackActivity } from './activity.services'

let activityStoreCornJob = null
let idleCornJob = null

export const startActivityStoreCorn = () => {
  if (activityStoreCornJob) return

  activityStoreCornJob = corn.schedule('*/10 * * * *', () => {
    trackActivity()
  })
}
export const stopActivityStoreCorn = () => {
  if (activityStoreCornJob) {
    activityStoreCornJob.stop()
    activityStoreCornJob = null
  }
}

export const startIdleCorn = () => {
  if (idleCornJob) {
    return
  }
  idleCornJob = corn.schedule('*/1 * * * *', checkIdle)
}

export const stopIdleCheckCron = () => {
  if (idleCornJob) {
    idleCornJob.stop()
    idleCornJob = null
  }
}
