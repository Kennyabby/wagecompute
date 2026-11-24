import React, { useContext, useEffect, useMemo, useState } from 'react'
import ContextProvider from '../../Resources/ContextProvider'

// What an admin uses to put the Session Manager record right when a day went
// wrong. Three cases are found from the server's records:
//   close   a manager still running from an earlier business day. It is
//           stopped at a time the admin picks, by default when the last
//           session of its day ended, so the record does not claim it ran
//           over the days after.
//   record  a finished business day whose sessions ran with no manager. One
//           is recorded from its first session to its last.
//   start   today's sessions are open with no manager. One is started from
//           the first of them, so nobody has to end a session mid-service.
// Each is saved by wageserver /pos/sessionManager/repair, which checks it
// against its own records and marks it as a repair with who made it.

const DAY = 24 * 60 * 60 * 1000
// Matches the sessions the till keeps (App.js getLastActiveSessions).
const WINDOW_DAYS = 8

const pad = (n) => String(n).padStart(2, '0')
const toLocalInput = (ms) => {
    const d = new Date(ms)
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
const fromLocalInput = (value) => {
    const ms = new Date(value).getTime()
    return Number.isFinite(ms) ? ms : null
}
const isSales = (s) => (s?.type || 'sales') === 'sales'
const isRunning = (m) => !m?.end && m?.active !== false

export const findManagerRepairs = ({ managers, sessions, getSessionStart, getSessionEnd, now = Date.now() }) => {
    const today = getSessionStart(now)
    const list = managers || []
    const running = [...list].filter(isRunning).sort((a, b) => b.start - a.start)[0] || null
    const stale = running && getSessionStart(running.start) !== today ? running : null
    const sales = (sessions || []).filter((s) => s?.start && isSales(s))
    const byDay = new Map()
    sales.forEach((s) => {
        const day = getSessionStart(s.start)
        if (!byDay.has(day)) byDay.set(day, [])
        byDay.get(day).push(s)
    })
    const items = []
    if (stale) {
        const own = byDay.get(getSessionStart(stale.start)) || []
        const lastEnd = Math.max(0, ...own.map((s) => Number(s.end) || 0))
        items.push({ kind: 'close', key: `close:${stale.start}`, manager: stale, dayStart: getSessionStart(stale.start), dayEnd: getSessionEnd(getSessionStart(stale.start)), suggested: lastEnd > stale.start ? lastEnd : now })
    }
    // A day counts as run under a manager when one started that day, or
    // when a stopped one ran over it. Before managers were tied to their own
    // day one could cover two, and those days are left as they are.
    const coveredByStopped = (t) => list.some((m) => m.end && m.start <= t && t <= m.end)
    ;[...byDay.keys()].sort((a, b) => a - b).forEach((day) => {
        const daySessions = byDay.get(day).sort((a, b) => a.start - b.start)
        if (list.some((m) => getSessionStart(m.start) === day)) return
        if (daySessions.every((s) => coveredByStopped(s.start))) return
        const open = daySessions.filter((s) => !s.end).length
        const base = { dayStart: day, dayEnd: getSessionEnd(day), sessions: daySessions, open }
        if (day < today) items.push({ kind: 'record', key: `record:${day}`, ...base })
        else if (day === today && open && !(running && !stale)) items.push({ kind: 'start', key: `start:${day}`, ...base })
    })
    return items
}

const SessionManagerRepair = ({ sessions, onRepair, onStartToday }) => {
    const { fetchServer, server, company, getSessionStart, getSessionEnd, sessionManagers, formatDateToDefault } = useContext(ContextProvider)
    const [managers, setManagers] = useState(null)
    const [endAt, setEndAt] = useState({})
    const [busy, setBusy] = useState('')

    // Its own read: the till's list holds two days, and a manager left
    // running longer than that has to be found too.
    const load = async () => {
        if (!company) return
        const resp = await fetchServer('POST', {
            database: company,
            collection: 'SessionManagers',
            prop: { $or: [{ start: { $gte: Date.now() - WINDOW_DAYS * DAY } }, { end: { $in: [null, ''] }, active: { $ne: false } }] },
        }, 'getDocsDetails', server).catch(() => null)
        if (resp && !resp.err && Array.isArray(resp.record)) setManagers(resp.record)
    }
    useEffect(() => { load() }, [company, sessionManagers]) // eslint-disable-line react-hooks/exhaustive-deps

    const items = useMemo(
        () => (managers ? findManagerRepairs({ managers, sessions, getSessionStart, getSessionEnd }) : []),
        [managers, sessions, getSessionStart, getSessionEnd],
    )
    if (!items.length) return null

    const stillRunning = items.some((i) => i.kind === 'close')
    const run = async (item, body) => {
        setBusy(item.key)
        const resp = await onRepair({ dayStart: item.dayStart, dayEnd: item.dayEnd, ...body })
        setBusy('')
        if (resp?.ok) load()
    }
    const time = (ms) => new Date(ms).toLocaleString()

    return (
        <div className='sm-repair' role='region' aria-label='Session Manager repair'>
            <strong className='sm-repair-title'>Session Manager needs putting right</strong>
            {items.map((item) => {
                const day = formatDateToDefault(item.dayStart)
                if (item.kind === 'close') {
                    const value = endAt[item.key] ?? toLocalInput(item.suggested)
                    const end = fromLocalInput(value)
                    const valid = end && end >= item.manager.start && end <= Date.now()
                    return (
                        <div className='sm-repair-item' key={item.key}>
                            <p>{`The Session Manager for ${day}, started ${time(item.manager.start)} by ${item.manager.startedBy || 'another device'}, was never stopped. Sessions on later days started under it.`}</p>
                            <label className='sm-repair-field'>
                                <span>Stopped at (by default, when the last session of that day ended)</span>
                                <input type='datetime-local' value={value} min={toLocalInput(item.manager.start)} max={toLocalInput(Date.now())} onChange={(e) => setEndAt((prev) => ({ ...prev, [item.key]: e.target.value }))} />
                            </label>
                            <button type='button' className='pos-session-board-btn' disabled={!!busy || !valid} onClick={() => run(item, { action: 'close', start: item.manager.start, end })}>
                                {busy === item.key ? 'Stopping...' : 'Stop it at this time'}
                            </button>
                        </div>
                    )
                }
                if (item.kind === 'record') {
                    const first = item.sessions[0].start
                    const last = Math.max(...item.sessions.map((s) => Number(s.end) || 0))
                    return (
                        <div className='sm-repair-item' key={item.key}>
                            <p>{`${day}: ${item.sessions.length} session(s) ran with no Session Manager of their own.`}</p>
                            {item.open
                                ? <p className='sm-repair-wait'>{`${item.open} of them are still open. End them first.`}</p>
                                : stillRunning
                                    ? <p className='sm-repair-wait'>Stop the Session Manager above first.</p>
                                    : <p>{`It will be recorded from ${time(first)} to ${time(last)}, when its first session started and its last one ended.`}</p>}
                            <button type='button' className='pos-session-board-btn' disabled={!!busy || !!item.open || stillRunning} onClick={() => run(item, { action: 'record' })}>
                                {busy === item.key ? 'Recording...' : `Record the Session Manager for ${day}`}
                            </button>
                        </div>
                    )
                }
                const blocked = stillRunning || items.some((i) => i.kind === 'record')
                return (
                    <div className='sm-repair-item' key={item.key}>
                        <p>{`Today: ${item.open} session(s) are open with no Session Manager. It can be started from ${time(item.sessions[0].start)}, when the first of them started, without ending anyone's session.`}</p>
                        {blocked && <p className='sm-repair-wait'>Put the days above right first.</p>}
                        <button type='button' className='pos-session-board-btn' disabled={!!busy || blocked} onClick={async () => {
                            setBusy(item.key)
                            const resp = await onStartToday({ dayStart: item.dayStart, dayEnd: item.dayEnd })
                            setBusy('')
                            if (resp?.ok) load()
                        }}>
                            {busy === item.key ? 'Starting...' : "Start today's Session Manager"}
                        </button>
                    </div>
                )
            })}
        </div>
    )
}

export default SessionManagerRepair
