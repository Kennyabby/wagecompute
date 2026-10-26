// The dates a user without backlog access (not an admin, no allowBacklogs
// permission) may see: the current day only. "Current" is the business day
// as well as the calendar day, so a POS session that runs 8am to 8am still
// shows its own sales after midnight, and nothing older appears anywhere.
//
// Every screen and report takes its bounds from here so they agree. They
// used to allow yesterday too, each worked out on its own, and some in UTC,
// which on a Lagos clock moved the first visible day back by one.
//
// Posting is separate: a new request may still be dated an earlier day, and
// goes for approval as usual. Only viewing is held to the current day.

import { localDate } from './businessDay'

export const canSeeBacklog = (companyRecord, allowBacklogs) => companyRecord?.status === 'admin' || !!allowBacklogs

export const currentDayWindow = (getSessionStart) => {
  const now = Date.now()
  const today = localDate(now)
  let start = today
  if (typeof getSessionStart === 'function') {
    const business = localDate(getSessionStart(now))
    if (business && business < start) start = business
  }
  return { start, end: today }
}

// Whether a YYYY-MM-DD (or anything Date can read) falls in the window.
export const isInCurrentDay = (value, getSessionStart) => {
  if (value === null || value === undefined || value === '') return false
  const day = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : localDate(new Date(value).getTime())
  const { start, end } = currentDayWindow(getSessionStart)
  return day >= start && day <= end
}

// Clamps a from/to pair into the window.
export const clampToCurrentDay = (from, to, getSessionStart) => {
  const { start, end } = currentDayWindow(getSessionStart)
  let a = from && from > start ? from : start
  let b = to && to < end ? to : end
  if (a > end) a = end
  if (b < a) b = a
  return { from: a, to: b }
}
