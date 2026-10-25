// Resources/businessDay.js
//
// Which trading day a POS moment belongs to, from the till's own clock.
// Sessions that run 8am to 8am sell after midnight on the previous day's
// business: an order at 01:30 on the 26th is a sale of the 25th. The real
// time stays on the order (createdAt, lastDeliveredAt). The business date is
// what it is reported and posted on, and when a time is needed it is
// counted at 23:59:59 of that day.
//
// getSessionStart is App.js's, so the closing hour (and its historical
// changes) come from one place. The server does the same for changes from
// older tills (wageserver/UserModule/POS/businessDay.js).

const pad = (n) => String(n).padStart(2, '0');
export const localDate = (ts) => {
  const d = new Date(Number(ts));
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export function businessDayOf(timestamp, getSessionStart) {
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || ts <= 0 || typeof getSessionStart !== 'function') return null;
  const businessDate = localDate(getSessionStart(ts));
  const calendarDate = localDate(ts);
  const overnight = calendarDate !== businessDate;
  let effectiveAt = ts;
  if (overnight) {
    const [y, m, d] = businessDate.split('-').map(Number);
    effectiveAt = new Date(y, m - 1, d, 23, 59, 59, 0).getTime();
  }
  return { businessDate, calendarDate, overnight, effectiveAt };
}

// Fields an order carries from the moment it is created.
export function orderBusinessFields(createdAt, getSessionStart) {
  const day = businessDayOf(createdAt, getSessionStart);
  if (!day) return {};
  return { businessDate: day.businessDate, overnight: day.overnight, postingDate: day.businessDate, postingStamp: day.effectiveAt };
}

// Fields a delivery adds to its order: the actual time stays in
// lastDeliveredAt, these say which day it counts for and at what time.
export function deliveryBusinessFields(deliveredAt, getSessionStart) {
  const day = businessDayOf(deliveredAt, getSessionStart);
  if (!day) return {};
  return { deliveryBusinessDate: day.businessDate, deliveryPostingStamp: day.effectiveAt, deliveredOvernight: day.overnight };
}
