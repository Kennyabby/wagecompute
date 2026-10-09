import { useCallback, useEffect, useState } from 'react'
import StatCard from '../Shared/ui/StatCard'
import StatCardGrid from '../Shared/ui/StatCardGrid'
import { formatAgo, formatDateTime } from './bcFormat'

const POLL_MS = 2000

/**
 * The Data page when reports read live from Business Central. Nothing is
 * stored, so there is no sync to manage: this shows what has been read into
 * memory so far and lets someone read it all again on demand.
 */
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
                <StatCard label='Data source' value='Live' description='Read from Business Central when a report runs. Nothing is stored here.' />
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
                                New entries are picked up automatically. Edits made in Business Central to entries that were already
                                read show up after the daily reload, or straight away if you reload now.
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
                <h3>Keeping a stored copy</h3>
                <p className='bc-muted'>
                    Live reading needs Business Central to be reachable, and starts from scratch after a server restart.
                    A stored copy in this database removes both limits: reports work while Business Central is offline, the copy is
                    kept current by an automatic or manual sync, and the Changes page records every difference found between
                    Business Central and the copy. It takes database space in proportion to your history.
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
