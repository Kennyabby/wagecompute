import { useCallback, useEffect, useState } from 'react'
import StatCard from '../Shared/ui/StatCard'
import StatCardGrid from '../Shared/ui/StatCardGrid'
import { formatAgo, formatDateTime } from './bcFormat'

const POLL_MS = 2000

/**
 * The Data page when reports read live from Business Central. There is no
 * sync to manage: this shows what has been read so far, what has changed in
 * Business Central since, and lets someone read it all again on demand.
 */
const describeChange = (change) => [
    change.added ? `${change.added.toLocaleString()} new` : '',
    change.changed ? `${change.changed.toLocaleString()} changed` : '',
    change.removed ? `${change.removed.toLocaleString()} removed` : '',
].filter(Boolean).join(', ')

const BCLive = ({ api, canManage, notify, onGoTo }) => {
    const [live, setLive] = useState(null)
    const [busy, setBusy] = useState(false)

    const load = useCallback(async () => {
        try {
            setLive((await api.getLiveStatus()).live)
        } catch (failure) {
            // Keep showing the last known state; the next poll tries again.
        }
    }, [api])

    useEffect(() => {
        load()
        const timer = setInterval(load, live?.loading ? POLL_MS : POLL_MS * 10)
        return () => clearInterval(timer)
    }, [load, live?.loading])

    const reload = async () => {
        setBusy(true)
        try {
            setLive((await api.refreshLive()).live)
            notify('info', 'Reading everything from Business Central again. Reports keep working from the previous figures until it finishes.')
        } catch (failure) {
            notify('error', failure.message)
        } finally {
            setBusy(false)
        }
    }

    const loading = !!live?.loading
    return (
        <div className='bc-page'>
            <StatCardGrid min={200}>
                <StatCard label='Data source' value='Live' description={live?.restored ? 'Started from the copy kept on the server, then brought up to date.' : 'Read from Business Central. Nothing is stored in the database.'} />
                <StatCard
                    label='New entries last checked'
                    value={live?.ready ? formatAgo(live.refreshedAt) : 'Not yet'}
                    description={live?.ready ? 'Checked again each time a report runs' : 'Happens when the first report is opened'}
                />
                <StatCard
                    label='Everything last read'
                    value={live?.ready ? formatAgo(live.builtAt) : 'Not yet'}
                    description={live?.builtAt ? formatDateTime(live.builtAt) : 'Read again once a day, or on demand'}
                />
                <StatCard
                    label='Latest ledger entry'
                    value={live?.lastEntryNo ? Number(live.lastEntryNo).toLocaleString() : 'None'}
                    description='Highest item ledger entry number read so far'
                />
            </StatCardGrid>

            <section className='bc-card'>
                <div className='bc-sync-actions'>
                    <div>
                        <h3>{loading ? 'Reading from Business Central' : 'Read everything again'}</h3>
                        {loading ? (
                            <p className='bc-muted'>
                                {live.progress?.table ? `${live.progress.table}: ` : ''}{(live.progress?.rows || 0).toLocaleString()} entries read so far.
                            </p>
                        ) : (
                            <p className='bc-muted'>
                                New entries are picked up automatically, and so are entries deleted in Business Central, which are
                                noticed by comparing counts every few minutes. Customer, vendor and bank entries are read again every
                                few minutes, so payments applied to old invoices show up too. An edit to an old item entry that leaves
                                the count unchanged shows up after the daily reload, or straight away if you reload now.
                            </p>
                        )}
                    </div>
                    <button type='button' className='bc-button bc-button-primary' disabled={busy || loading} onClick={reload}>
                        {loading ? 'Reading...' : 'Reload from Business Central'}
                    </button>
                </div>
                {loading && <div className='bc-progress bc-progress-busy' role='progressbar' aria-label='Reading from Business Central'><div /></div>}
                {live?.error && !loading && (
                    <div className='bc-banner bc-banner-error'>
                        The last read from Business Central failed: {live.error}
                        {live.ready ? ' Reports are showing the figures from the read before it.' : ''}
                    </div>
                )}
            </section>

            <section className='bc-card'>
                <h3>Changes picked up from Business Central</h3>
                {live?.changes?.length ? (
                    <div className='bc-table-scroll'>
                        <table className='bc-table'>
                            <thead><tr><th>When</th><th>Table</th><th>What changed</th><th>Note</th></tr></thead>
                            <tbody>
                                {live.changes.map((change) => (
                                    <tr key={change.id}>
                                        <td>{formatDateTime(change.at)}</td>
                                        <td>{change.table}</td>
                                        <td>{describeChange(change) || 'See note'}</td>
                                        <td>{change.note}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className='bc-empty'>Nothing has changed in Business Central since the data was read.</p>
                )}
            </section>

            <section className='bc-card'>
                <h3>Keeping a stored copy</h3>
                <p className='bc-muted'>
                    Live reading needs Business Central to be reachable to pick up anything new. A stored copy in the database
                    removes that limit: reports work while Business Central is offline, the copy is kept current by an automatic
                    or manual sync, and the Changes page records every difference found, field by field. It takes database
                    space in proportion to your history.
                </p>
                {canManage ? (
                    <div>
                        <button type='button' className='bc-button' onClick={() => onGoTo('connection')}>Choose where data is kept</button>
                    </div>
                ) : (
                    <p className='bc-muted'>An admin can switch this on from the Connection page.</p>
                )}
            </section>
        </div>
    )
}

export default BCLive
