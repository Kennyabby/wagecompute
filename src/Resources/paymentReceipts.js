// The list of payments taken, one row per receipt, that the Payment Receipts
// view shows: debt recoveries on sales days, accommodation payments and POS
// order payments. Shared by the Payment Receipts report (App.js) and the
// Session Manager reconciliation, so both count money the same way.

const DATE_BOUNDARY = '2025-07-01'

const localDate = (value) => {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const isoDate = (value) => {
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10)
}

export const buildPaymentReceipts = ({ sales = [], accommodations = [], orders = [], sessions = [] } = {}) => {
  const recoveryReceipts = []
  const accommodationReceipts = []
  const posOrderReceipts = []

  ;(sales || []).forEach((sale) => {
    (sale.recoveryList || []).forEach((recovery) => {
      // No longer gated on "is this payPoint one of the CURRENTLY
      // configured payment method names", a payment method renamed in
      // Settings (e.g. adding an account number suffix) after this
      // recovery was recorded made the exact-name check fail forever,
      // silently dropping real historical payments from this report.
      // What actually happened shouldn't depend on today's Settings.
      if (isoDate(recovery.recoveryDate) >= DATE_BOUNDARY) {
        recoveryReceipts.push({
          paymentModule: 'recovery',
          paymentPoint: recovery.recoveryPoint,
          paymentAmount: Number(recovery.recoveryAmount),
          paymentReceipt: Number(recovery.recoveryReceipt) || recovery.recoveryReceipt,
          paymentFor: `For ${sale.postingDate} Debt`,
          paymentDate: recovery.recoveryDate,
          paymentHandler: recovery.recoveryEmployeeId,
          paymentModuleRef: sale.createdAt,
          paymentApprover: 'Default'
        })
      }
    })
  })

  ;(accommodations || []).forEach((acc) => {
    if (isoDate(acc.postingDate) < DATE_BOUNDARY) return
    // A booking's payment can be split across multiple payment
    // methods in one submission (Accommodation.js's "Also Paid in
    // Cash" split-bill), one receipt per paymentHistory entry, not
    // one receipt using the booking's top-level payPoint/
    // paymentAmount (now the LAST leg's payPoint and the
    // CUMULATIVE total received, not any single payment's amount).
    const history = Array.isArray(acc.paymentHistory) ? acc.paymentHistory : []
    const events = history.length
      ? history
      : (acc.payPoint && Number(acc.paymentAmount) > 0 ? [{ payPoint: acc.payPoint, paymentAmount: acc.paymentAmount, paymentReceipt: acc.paymentReceipt }] : [])
    events.forEach((event) => {
      accommodationReceipts.push({
        paymentModule: 'accommodation',
        paymentPoint: event.payPoint,
        paymentAmount: Number(event.paymentAmount),
        paymentReceipt: Number(event.paymentReceipt) || event.paymentReceipt,
        paymentFor: `For Room ${acc.roomNo}`,
        paymentDate: event.paymentDate || acc.postingDate,
        paymentHandler: acc.employeeId,
        paymentModuleRef: acc.createdAt,
        paymentApprover: 'Default'
      })
    })
  })

  ;(orders || []).forEach((order) => {
    if (!order.salesPosts || order.status === 'cancelled') return
    // An order taken after midnight on an overnight session counts for the
    // business day it belongs to, the same date the sale is posted under.
    const dateVar = order.businessDate || (order.createdAt ? localDate(order.createdAt) : DATE_BOUNDARY)
    if (dateVar < DATE_BOUNDARY) return
    Object.keys(order.salesPosts).forEach((payPoint) => {
      const location = order.salesPosts[payPoint]
      const receiptNo = (payPoint === 'cash') ? 'cash' : order.receipts?.[payPoint]
      const session = (sessions || []).find((s) => s.start === order.sessionId)
      posOrderReceipts.push({
        paymentModule: `POS Order-${location}`,
        paymentPoint: payPoint,
        paymentAmount: Number(order[payPoint]),
        paymentReceipt: Number(receiptNo) || receiptNo,
        paymentFor: `(${location})-${order.orderNumber} Ordered from ${order.wrh}`,
        paymentTable: order.tableId,
        paymentOrder: order.orderNumber,
        paymentDate: dateVar,
        paymentHandler: order.handlerId,
        paymentModuleRef: order.createdAt,
        paymentApprover: session?.endedby || 'Active Session'
      })
    })
  })

  return [...recoveryReceipts, ...accommodationReceipts, ...posOrderReceipts]
}

// Money owed rather than received over a period, in the same row shape so
// the Payment Receipts view lays it out beside the payments. Debts and
// shortages arise in three places only, and are read from each directly:
//   - a POS session that closed short of its sales (debtDue on the closed
//     session);
//   - an inventory reconciliation that charged its shortage to employees
//     (shortagePostings on each location of the reconciliation; the copy
//     kept on the POS session is not counted again);
//   - accommodation booked in the period and not yet paid in full.
// Each row carries kind 'debt' or 'shortage', so the money received can be
// totalled on its own, and how much of it has been recovered since and how
// much remains (recoveredAmount, remainingAmount), read from where each
// recovery is recorded:
//   - a session's debt is recovered on the sales day it was posted under
//     (the session's row there carries debtRecovered; a row covering more
//     than one session shares it in proportion to each one's debt);
//   - a reconciliation shortage, on the session it was charged to
//     (inventoryShortageCharges[].recoveredAmount);
//   - accommodation, by payments made after the period.
// sales are the sales days the sessions were posted under, any date.
const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100

const withRecovery = (row, recovered) => {
  const owed = Number(row.paymentAmount || 0)
  const got = Math.min(owed, Math.max(0, round2(recovered)))
  return { ...row, recoveredAmount: got, remainingAmount: round2(owed - got) }
}

export const buildDebtRows = ({ sessions = [], accommodations = [], reconciliations = [], sales = [], from, to } = {}) => {
  const rows = []
  const inRange = (day) => !!day && (!from || day >= from) && (!to || day <= to)

  // The sales-day row each session's debt was posted on.
  const sessionRowOf = (start) => {
    for (const sale of sales || []) {
      if (!(sale.salesSessions || []).includes(start)) continue
      const row = (sale.record || []).find((r) => r.isSession && (r.salesSessions || []).includes(start))
      if (row) return row
    }
    return null
  }
  const debtOfRowSessions = (row) => (sessions || [])
    .filter((s) => (row.salesSessions || []).includes(s.start))
    .reduce((sum, s) => sum + Number(s.debtDue || 0), 0)

  ;(sessions || []).forEach((session) => {
    if (!session.end || session.active || !(Number(session.debtDue) > 0)) return
    const debt = Number(session.debtDue)
    const row = sessionRowOf(session.start)
    const rowDebt = row ? debtOfRowSessions(row) : 0
    const recovered = row && rowDebt > 0 ? Number(row.debtRecovered || 0) * (debt / rowDebt) : 0
    rows.push(withRecovery({
      kind: 'debt',
      paymentModule: `POS Session-${session.wrh || ''}`,
      paymentPoint: 'Debt',
      paymentAmount: debt,
      paymentReceipt: '-',
      paymentFor: `Session closed short of its sales at ${session.wrh || 'the till'}${row ? '' : ' (not yet posted to a sales day)'}`,
      paymentDate: localDate(session.start),
      paymentHandler: session.employee_id,
      paymentModuleRef: session.start,
      paymentApprover: session.endedby || '',
    }, recovered))
  })

  ;(reconciliations || []).forEach((rec) => {
    ;(rec.locations || []).forEach((loc) => {
      ;(loc.shortagePostings || []).forEach((posting) => {
        const day = String(posting.postingDate || rec.postingDate || '').slice(0, 10)
        if (!inRange(day) || !(Number(posting.amountCharged) > 0)) return
        const location = posting.location || loc.location || ''
        const session = (sessions || []).find((s) => s.start === posting.sessionStart)
        const charge = (session?.inventoryShortageCharges || []).find((c) => String(c.reconciliationId) === String(rec._id) && (c.location || '') === location)
          || (session?.inventoryShortageCharges || []).find((c) => (c.location || '') === location && String(c.postingDate || '') === day && Number(c.amount) === Number(posting.amountCharged))
        rows.push(withRecovery({
          kind: 'shortage',
          paymentModule: `Reconciliation-${location}`,
          paymentPoint: 'Shortage',
          paymentAmount: Number(posting.amountCharged),
          paymentReceipt: loc.shortageReferenceNo || rec.documentNo || '-',
          paymentFor: `Inventory shortage charged at ${location || 'the store'}`,
          paymentDate: day,
          paymentHandler: posting.employee_id,
          paymentModuleRef: posting.sessionStart,
          paymentApprover: posting.postedBy || '',
        }, Number(charge?.recoveredAmount || 0)))
      })
    })
  })

  ;(accommodations || []).forEach((acc) => {
    if (!inRange(String(acc.postingDate || '').slice(0, 10))) return
    const total = Number(acc.accommodationAmount || 0)
    const history = Array.isArray(acc.paymentHistory) ? acc.paymentHistory : []
    const paidBy = (when) => (history.length
      ? history.filter((h) => when(String(h.paymentDate || acc.postingDate || '').slice(0, 10))).reduce((sum, h) => sum + Number(h.paymentAmount || 0), 0)
      : (when(String(acc.postingDate || '').slice(0, 10)) ? Number(acc.paymentAmount || 0) : 0))
    // What was still owed when the period closed; payments after it are its
    // recovery.
    const owedAtClose = round2(total - paidBy((day) => !to || day <= to))
    if (owedAtClose > 0) {
      rows.push(withRecovery({
        kind: 'debt',
        paymentModule: 'accommodation',
        paymentPoint: 'Debt',
        paymentAmount: owedAtClose,
        paymentReceipt: '-',
        paymentFor: `Room ${acc.roomNo} balance unpaid`,
        paymentDate: acc.postingDate,
        paymentHandler: acc.employeeId,
        paymentModuleRef: acc.createdAt,
        paymentApprover: 'Default',
      }, paidBy((day) => !!to && day > to)))
    }
  })

  return rows
}

export { localDate }
