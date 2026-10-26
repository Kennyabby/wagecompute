import { buildDebtRows, buildPaymentReceipts } from './paymentReceipts'
import { clampToCurrentDay, currentDayWindow, isInCurrentDay } from './viewWindow'

const at = (iso) => new Date(iso).getTime()

describe('debts and shortages for the Session Manager reconciliation', () => {
  const sessionStart = at('2026-10-25T09:00:00')
  const sessions = [
    { start: sessionStart, end: at('2026-10-26T06:00:00'), active: false, employee_id: 'ada', wrh: 'bar', endedby: 'sm', debtDue: 4000,
      inventoryShortageCharges: [{ reconciliationId: 'R1', location: 'bar', postingDate: '2026-10-25', amount: 1500, recoveredAmount: 500 }] },
    { start: at('2026-10-25T10:00:00'), end: null, active: true, employee_id: 'tolu', wrh: 'bar', debtDue: 900 },
  ]
  const reconciliations = [{ _id: 'R1', postingDate: '2026-10-25', locations: [{ location: 'bar', shortageReferenceNo: 'REC-1', shortagePostings: [{ sessionStart, employee_id: 'ada', amountCharged: 1500, postingDate: '2026-10-25', location: 'bar', postedBy: 'sm' }] }] }]
  const sales = [{ createdAt: 1, postingDate: '2026-10-25', salesSessions: [sessionStart], record: [{ isSession: true, salesSessions: [sessionStart], debt: 4000, debtRecovered: 1000 }] }]
  const accommodations = [{ createdAt: 2, roomNo: '12', postingDate: '2026-10-25', accommodationAmount: 30000, paymentAmount: 25000, employeeId: 'kemi',
    paymentHistory: [{ paymentDate: '2026-10-25', paymentAmount: 20000 }, { paymentDate: '2026-10-27', paymentAmount: 5000 }] }]
  const rows = buildDebtRows({ sessions, reconciliations, sales, accommodations, from: '2026-10-25', to: '2026-10-26' })

  it('takes a closed session\'s shortfall, with what its sales day has recovered of it', () => {
    const row = rows.find((r) => r.paymentModule === 'POS Session-bar')
    expect(row).toMatchObject({ kind: 'debt', paymentAmount: 4000, recoveredAmount: 1000, remainingAmount: 3000, paymentHandler: 'ada' })
  })
  it('leaves out a session that is still open', () => {
    expect(rows.some((r) => r.paymentHandler === 'tolu')).toBe(false)
  })
  it('takes a reconciliation shortage once, recovered from the charge on the session', () => {
    const shortages = rows.filter((r) => r.kind === 'shortage')
    expect(shortages).toHaveLength(1)
    expect(shortages[0]).toMatchObject({ paymentAmount: 1500, recoveredAmount: 500, remainingAmount: 1000, paymentReceipt: 'REC-1' })
  })
  it('counts accommodation still owed when the period closed, and later payments as recovered', () => {
    const row = rows.find((r) => r.paymentModule === 'accommodation')
    expect(row).toMatchObject({ kind: 'debt', paymentAmount: 10000, recoveredAmount: 5000, remainingAmount: 5000 })
  })
  it('keeps payments apart from what is owed', () => {
    const paid = buildPaymentReceipts({ accommodations })
    expect(paid.every((r) => !r.kind)).toBe(true)
  })
})

describe('the current day for users without backlog access', () => {
  afterEach(() => jest.useRealTimers())

  it('is today alone once the business day has started', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-26T10:00:00'))
    const sessionStart = (ts) => { const d = new Date(ts); if (d.getHours() < 8) d.setDate(d.getDate() - 1); d.setHours(8, 0, 0, 0); return d.getTime() }
    expect(currentDayWindow(sessionStart)).toEqual({ start: '2026-10-26', end: '2026-10-26' })
    expect(isInCurrentDay('2026-10-25', sessionStart)).toBe(false)
  })
  it('reaches back to the business day after midnight on an overnight session', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-26T02:00:00'))
    const sessionStart = (ts) => { const d = new Date(ts); if (d.getHours() < 8) d.setDate(d.getDate() - 1); d.setHours(8, 0, 0, 0); return d.getTime() }
    expect(currentDayWindow(sessionStart)).toEqual({ start: '2026-10-25', end: '2026-10-26' })
    expect(clampToCurrentDay('2026-10-01', '2026-10-31', sessionStart)).toEqual({ from: '2026-10-25', to: '2026-10-26' })
  })
})
