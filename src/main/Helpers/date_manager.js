import { format } from 'date-fns'

export const getTimeSlot = (date = new Date()) => {
  const copiedDate = new Date(date)
  copiedDate.setMinutes(Math.floor(copiedDate.getMinutes() / 10) * 10, 0, 0)
  return formatDateToDefaultFormat(copiedDate)
}

export const formatDateToDefaultFormat = (date = new Date()) => {
  return format(date, "yyyy-MM-dd'T'HH:mm:ssxxx")
}
