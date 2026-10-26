// The figures of a Session Manager reconciliation for whole business days:
// the money taken (POS orders, accommodation payments, debt recoveries) and
// the debts and shortages incurred (closed POS sessions, the inventory
// reconciliation, accommodation left unpaid), in the Payment Receipts row
// shape. Used when a Session Manager is started (SessionManagerReconcile.js)
// and when looking back at a date range from Payment Receipts.
//
// It covers business days, not one Session Manager's own hours. A Session
// Manager restarted at 8pm still belongs to the day that began at 8am, and
// the posted sales day counts every session of it; reading only from 8pm
// left out the day's earlier sales.

import { buildPaymentReceipts, buildDebtRows, localDate } from './paymentReceipts'

// Business day D runs from its closing hour on D to the same hour on D+1;
// late on D is always inside it.
const businessStartOf = (day, getSessionStart) => {
  const [y, m, d] = String(day).split('-').map(Number)
  return getSessionStart(new Date(y, m - 1, d, 23, 59, 0, 0).getTime())
}

export const businessDateOf = (timestamp, getSessionStart) => localDate(getSessionStart(Number(timestamp)))

export const loadReconciliation = async ({ fetchServer, server, company, from, to, getSessionStart, getSessionEnd }) => {
  const read = (collection, prop) => fetchServer('POST', { database: company, collection, prop }, 'getDocsDetails', server)
    .then((resp) => (resp && !resp.err && Array.isArray(resp.record) ? resp.record : Promise.reject(new Error(resp?.mess || `Could not load ${collection}.`))))
  const startTs = businessStartOf(from, getSessionStart)
  const endTs = getSessionEnd(businessStartOf(to, getSessionStart))
  const span = { $gte: startTs, $lt: endTs }
  const [orders, sessions, accommodations, sales, reconciliations, managers] = await Promise.all([
    read('Orders', { $or: [{ sessionId: span }, { createdAt: span }] }),
    read('POSSessions', { start: span }),
    read('Accommodations', { $or: [{ 'paymentHistory.paymentDate': { $gte: from, $lte: to } }, { postingDate: { $gte: from, $lte: to } }] }),
    read('Sales', { 'recoveryList.recoveryDate': { $gte: from, $lte: to } }),
    read('InventoryReconciliations', { postingDate: { $gte: from, $lte: to } }),
    read('SessionManagers', { start: span }),
  ])
  // The sales days these sessions were posted under carry what has been
  // recovered of each session's debt.
  const starts = sessions.map((s) => s.start).filter((v) => v != null)
  const postedUnder = starts.length ? await read('Sales', { salesSessions: { $in: starts } }) : []

  // Orders were read by their sessions' hours; the other modules carry only
  // a date, so they are kept to the dates.
  const paid = buildPaymentReceipts({ sales, accommodations, orders, sessions })
    .filter((row) => {
      if (String(row.paymentModule).startsWith('POS Order')) return true
      const day = String(row.paymentDate || '').slice(0, 10)
      return day >= from && day <= to
    })
  const owed = buildDebtRows({ sessions, accommodations, reconciliations, sales: postedUnder, from, to })
  return {
    rows: [...paid, ...owed],
    managers: managers.map((m) => ({ ...m, businessDate: businessDateOf(m.start, getSessionStart) })),
  }
}

export const totalsOf = (rows) => {
  const sum = (kind, field = 'paymentAmount') => rows.filter((row) => (row.kind || 'payment') === kind).reduce((s, row) => s + Number(row[field] || 0), 0)
  return {
    received: sum('payment'),
    debts: sum('debt'),
    shortages: sum('shortage'),
    recovered: sum('debt', 'recoveredAmount') + sum('shortage', 'recoveredAmount'),
    remaining: sum('debt', 'remainingAmount') + sum('shortage', 'remainingAmount'),
  }
}

// What was decided for a day: the decision on each Session Manager of that
// business day, made when the next one was started.
export const describeVerdicts = (managers = []) => managers
  .filter((m) => m.end)
  .sort((a, b) => a.start - b.start)
  .map((m) => {
    const r = m.reconciliation
    const run = `Session Manager started ${new Date(m.start).toLocaleString()}`
    if (!r) return { status: 'none', text: `${run}: not reconciled (stopped before reconciliation was required, or the next one has not been started yet).` }
    return {
      status: r.status,
      text: `${run}: ${r.status === 'approved' ? 'approved' : 'declined'} by ${r.by} at ${new Date(r.at).toLocaleString()}${r.note ? `. Note: ${r.note}` : ''}${r.total ? `. Received then: ₦${Number(r.total).toLocaleString()}` : ''}`,
    }
  })
