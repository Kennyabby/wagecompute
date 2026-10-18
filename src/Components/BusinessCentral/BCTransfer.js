import { useCallback, useEffect, useRef, useState } from 'react'
import { formatDateTime } from './bcFormat'

/**
 * Moving a Business Central connection between workspaces. The workspace
 * that has the connection makes a one-time code; the workspace receiving it
 * enters the code, and the server moves the connection with everything made
 * for it and, if chosen, its stored copy. For admins.
 */

const STEPS = {
    starting: 'Starting',
    connection: 'Moving the connection',
    settings: 'Moving report edits, built reports and mappings',
    indexes: 'Preparing the moved data for reports',
    einvoice: 'Moving e-invoicing records',
    finishing: 'Finishing',
    done: 'Done',
}
const STATUS = { pending: 'Waiting for the code', moving: 'Moving', done: 'Moved', cancelled: 'Cancelled', expired: 'Expired' }

export const stepText = (progress) => {
    if (!progress?.step) return ''
    if (progress.step.startsWith('stored:')) {
        const name = progress.step.slice(7).replace(/^BC_/, '')
        const moved = progress.moved?.[progress.step.slice(7)]
        return `Moving stored ${name}${moved ? ` (${moved.toLocaleString()} rows so far)` : ''}`
    }
    return STEPS[progress.step] || progress.step
}

const BCTransfer = ({ api, connection, connections = [], onChanged, notify = () => {} }) => {
    const [transfers, setTransfers] = useState([])
    const [code, setCode] = useState('')
    const [made, setMade] = useState(null)
    const [moveData, setMoveData] = useState(true)
    const [moveEInvoice, setMoveEInvoice] = useState(true)
    const [busy, setBusy] = useState('')
    const [error, setError] = useState('')
    const finished = useRef(new Set())

    const load = useCallback(async () => {
        try {
            const answer = await api.listTransfers()
            setTransfers(answer.transfers || [])
            // A move into this workspace that has just finished brings the
            // connection here: the module is loaded again.
            const arrived = (answer.transfers || []).find((entry) => entry.direction === 'in' && entry.status === 'done' && !finished.current.has(entry.id) && entry.finishedAt > Date.now() - 10 * 60 * 1000)
            ;(answer.transfers || []).filter((entry) => entry.status === 'done').forEach((entry) => finished.current.add(entry.id))
            if (arrived && onChanged) {
                notify('success', `${arrived.company} is now connected to this workspace.`)
                onChanged()
            }
        } catch (failure) { setError(failure.message) }
    }, [api, onChanged, notify])

    useEffect(() => {
        let active = true
        // What was already done when the page opened is not news.
        api.listTransfers().then((answer) => {
            if (!active) return
            ;(answer.transfers || []).filter((entry) => entry.status === 'done').forEach((entry) => finished.current.add(entry.id))
            setTransfers(answer.transfers || [])
        }).catch((failure) => { if (active) setError(failure.message) })
        return () => { active = false }
    }, [api])

    // While something is moving, look again every few seconds.
    const moving = transfers.some((entry) => entry.status === 'moving')
    useEffect(() => {
        if (!moving) return undefined
        const timer = setInterval(load, 3000)
        return () => clearInterval(timer)
    }, [moving, load])

    const start = async () => {
        setBusy('start')
        setError('')
        try {
            const answer = await api.startTransfer({ connectionId: connection?.id, moveData, moveEInvoice })
            setMade(answer)
            await load()
        } catch (failure) { setError(failure.message) } finally { setBusy('') }
    }
    const accept = async () => {
        setBusy('accept')
        setError('')
        try {
            await api.acceptTransfer(code.trim())
            setCode('')
            notify('success', 'The code is accepted. The connection is being moved here.')
            await load()
        } catch (failure) { setError(failure.message) } finally { setBusy('') }
    }
    const cancel = async (id) => {
        try {
            await api.cancelTransfer(id)
            if (made?.transfer?.id === id) setMade(null)
            await load()
        } catch (failure) { setError(failure.message) }
    }
    const stored = connection?.storageMode === 'stored' && connection?.primary !== false
    // Every company on the same server moves together, so the switching
    // between them is there in the new workspace too.
    const serverOf = (entry) => String(entry?.baseUrl || '').trim().toLowerCase().replace(/\/+$/, '')
    const server = serverOf(connection)
    const together = connections.filter((entry) => serverOf(entry) === server)
    const companies = together.length ? together.map((entry) => entry.company || entry.name).filter(Boolean) : [connection?.company].filter(Boolean)

    return (
        <section className='bc-card bc-transfer'>
            <h3>Move between workspaces</h3>
            <p className='bc-muted'>A Business Central company belongs to one workspace at a time, and once moved it is no longer here. To move it to another, make a code here and enter it in the workspace that should have it. The connection moves with its report edits, built reports, saved column mappings, dashboard layout and, if chosen, its stored copy and e-invoicing records.</p>
            {error && <div className='bc-banner bc-banner-error'>{error}</div>}

            <div className='bc-transfer-part'>
                <h4>Receive a connection</h4>
                <div className='bc-transfer-row'>
                    <input className='bc-input' aria-label='Transfer code' placeholder='XXXX-XXXX-XXXX-XXXX' value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} />
                    <button type='button' className='bc-button bc-button-primary' disabled={busy === 'accept' || code.replace(/[^A-Z0-9]/g, '').length < 16} onClick={accept}>{busy === 'accept' ? 'Checking...' : 'Receive'}</button>
                </div>
            </div>

            {connection && (
                <div className='bc-transfer-part'>
                    <h4>Move {companies.length > 1 ? `${companies.length} companies on this server` : companies[0] || 'this connection'} to another workspace</h4>
                    {companies.length > 1 && <p className='bc-muted'>{companies.join(', ')} move together, so they can be switched between in the new workspace as they are here, each with its own settings and reports.</p>}
                    {stored && (
                        <label className='bc-einv-switch'>
                            <input type='checkbox' checked={moveData} onChange={(event) => setMoveData(event.target.checked)} />
                            <span>Move the stored copy too<span className='bc-muted'> (moved in batches, each deleted here as it is written there, so the database never holds two copies. Untick to delete it here and let the other workspace sync from the start.)</span></span>
                        </label>
                    )}
                    <label className='bc-einv-switch'>
                        <input type='checkbox' checked={moveEInvoice} onChange={(event) => setMoveEInvoice(event.target.checked)} />
                        <span>Move e-invoicing records and settings<span className='bc-muted'> (when e-invoicing reads this connection)</span></span>
                    </label>
                    <div className='bc-transfer-row'>
                        <button type='button' className='bc-button' disabled={busy === 'start'} onClick={start}>{busy === 'start' ? 'Making...' : 'Make a transfer code'}</button>
                    </div>
                    {made && (
                        <div className='bc-banner bc-banner-info bc-transfer-code'>
                            <p>Enter this code in the workspace that should have the connection. It works once, until {formatDateTime(made.transfer.expiresAt)}, and is not shown again.</p>
                            <code aria-label='The transfer code'>{made.code}</code>
                            <button type='button' className='bc-button' onClick={() => { navigator.clipboard?.writeText(made.code); notify('success', 'Copied.') }}>Copy</button>
                        </div>
                    )}
                </div>
            )}

            {transfers.length > 0 && (
                <div className='bc-table-scroll'>
                    <table className='bc-table'>
                        <thead><tr><th>Direction</th><th>Company</th><th>Made</th><th>Status</th><th>Progress</th><th /></tr></thead>
                        <tbody>
                            {transfers.map((entry) => (
                                <tr key={entry.id}>
                                    <td>{entry.direction === 'in' ? 'Into this workspace' : 'Out of this workspace'}</td>
                                    <td>{entry.company}{entry.moveData === false ? ' (without stored data)' : ''}</td>
                                    <td>{formatDateTime(entry.createdAt)}{entry.createdBy ? ` by ${entry.createdBy}` : ''}</td>
                                    <td><span className={`bc-status bc-status-${entry.status === 'done' ? 'ok' : entry.status === 'moving' ? 'info' : 'muted'}`}>{STATUS[entry.status] || entry.status}</span></td>
                                    <td>{entry.status === 'moving' ? stepText(entry.progress) : entry.error ? <span className='bc-muted'>Stopped: {entry.error}. It carries on by itself.</span> : ''}</td>
                                    <td>{entry.status === 'pending' && entry.direction === 'out' && <button type='button' className='bc-link-button' onClick={() => cancel(entry.id)}>Cancel</button>}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    )
}

export default BCTransfer
