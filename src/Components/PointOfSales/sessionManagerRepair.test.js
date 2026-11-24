import { findManagerRepairs } from './SessionManagerRepair'

// Business days that close at 08:00, as The Plantain Planet's do.
const getSessionStart = (ms) => {
    const d = new Date(ms)
    const start = new Date(d)
    start.setHours(8, 0, 0, 0)
    if (d.getTime() < start.getTime()) start.setDate(start.getDate() - 1)
    return start.getTime()
}
const getSessionEnd = (dayStart) => {
    const end = new Date(dayStart)
    end.setDate(end.getDate() + 1)
    return end.getTime()
}
const t = (s) => new Date(s).getTime()

// 22 Nov's manager was never stopped; 23 Nov ran with none; on 24 Nov
// sessions are open with none.
const now = t('2026-11-24T21:30:00')
const m21 = { start: t('2026-11-21T15:46:21'), end: t('2026-11-22T13:36:02'), active: false }
const m22 = { start: t('2026-11-22T14:32:31'), end: null, active: true, startedBy: '1' }
const sessions = [
    { start: t('2026-11-22T14:32:31'), end: t('2026-11-23T12:29:38') },
    { start: t('2026-11-22T14:43:09'), end: t('2026-11-23T11:49:20') },
    { start: t('2026-11-23T13:28:34'), end: t('2026-11-24T18:57:24') },
    { start: t('2026-11-23T13:46:25'), end: t('2026-11-24T16:53:00') },
    { start: t('2026-11-24T19:45:36'), end: null, active: true },
    { start: t('2026-11-24T21:01:16'), end: null, active: true, type: 'sales' },
    { start: t('2026-11-24T21:05:00'), end: null, active: true, type: 'delivery' },
]
const find = (managers) => findManagerRepairs({ managers, sessions, getSessionStart, getSessionEnd, now })

test('finds all three repairs for the 22-24 Nov timeline, oldest first', () => {
    const items = find([m21, m22])
    expect(items.map((i) => i.kind)).toEqual(['close', 'record', 'start'])
    expect(items[0].manager.start).toBe(m22.start)
    // Suggested stop: when the last session of 22 Nov ended.
    expect(items[0].suggested).toBe(t('2026-11-23T12:29:38'))
    expect(items[1].dayStart).toBe(t('2026-11-23T08:00:00'))
    expect(items[2].open).toBe(2)
})

test('after the 22nd is stopped and the 23rd recorded, only today remains', () => {
    const closed = { ...m22, end: t('2026-11-23T12:29:38'), active: false }
    const m23 = { start: t('2026-11-23T13:28:34'), end: t('2026-11-24T18:57:24'), active: false }
    expect(find([m21, closed, m23]).map((i) => i.kind)).toEqual(['start'])
})

test('nothing to repair once today has its own manager', () => {
    const closed = { ...m22, end: t('2026-11-23T12:29:38'), active: false }
    const m23 = { start: t('2026-11-23T13:28:34'), end: t('2026-11-24T18:57:24'), active: false }
    const m24 = { start: t('2026-11-24T19:45:36'), end: null, active: true }
    expect(find([m21, closed, m23, m24])).toEqual([])
})

test('a stopped manager that ran over two days is left as it is', () => {
    // How managers ran before they were tied to their own day.
    const long = { start: t('2026-11-22T14:32:31'), end: t('2026-11-24T19:00:00'), active: false }
    const m24 = { start: t('2026-11-24T19:45:36'), end: null, active: true }
    expect(find([m21, long, m24])).toEqual([])
})

test('a stale manager stopped at "now" would hide the days after it, so the default is the day\'s last session', () => {
    const items = find([m21, m22])
    expect(items[0].suggested).toBeLessThan(t('2026-11-23T13:28:34'))
})
