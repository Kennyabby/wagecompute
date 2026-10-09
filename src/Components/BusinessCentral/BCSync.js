import { useEffect, useState } from 'react'
import StatCard from '../Shared/ui/StatCard'
import StatCardGrid from '../Shared/ui/StatCardGrid'
import { formatAgo, formatDateTime, formatDuration } from './bcFormat'

const RUN_STATUS = {
    running: 'Running',
    completed: 'Completed',
    completed_with_errors: 'Completed with errors',
    failed: 'Failed',
    cancelled: 'Cancelled',
    interrupted: 'Interrupted',
}

const MODE_LABEL = { incremental: 'Sync', verify: 'Check for changes', full: 'Full reload' }
const GROUP_LABEL = { ledger: 'Ledgers', master: 'Master data', document: 'Open documents', postedDocument: 'Posted documents' }
const GROUP_ORDER = ['ledger', 'master', 'document', 'postedDocument']

const statusTone = (status) => {
    if (status === 'completed') return 'ok'
    if (status === 'running') return 'info'
    if (status === 'failed' || status === 'completed_with_errors' || status === 'interrupted') return 'error'
    return 'muted'
}

// What one dataset row says in its status column.
const describeDataset = (config, state, progress) => {
    if (progress?.status === 'running') return { tone: 'info', text: progress.phase === 'checking' ? 'Checking for changes' : 'Syncing' }
    if (!config?.available) return { tone: 'muted', text: 'Not published in Business Central' }
    if (!config.enabled) return { tone: 'muted', text: 'Switched off' }
    if (config.missingRequired?.length) return { tone: 'error', text: `Needs field mapping: ${config.missingRequired.join(', ')}` }
    if (state?.lastError) return { tone: 'error', text: state.lastError }
    if (!state?.lastSyncedAt) return { tone: 'muted', text: 'Not synced yet' }
    if (state.outOfStep) return { tone: 'error', text: `Out of step: Business Central has ${state.bcCount?.toLocaleString()} rows, the copy has ${state.localCount?.toLocaleString()}` }
    return { tone: 'ok', text: 'In step with Business Central' }
}

const BCSync = ({ api, connection, datasets, status, history, canManage, onStart, onCancel, busy, onGoTo }) => {
    // Re-render once a minute so "5 min ago" keeps moving while the page is open.
    const [, setTick] = useState(0)
    useEffect(() => {
        const timer = setInterval(() => setTick((value) => value + 1), 60000)
        return () => clearInterval(timer)
    }, [])

    const run = status?.run
    const running = !!status?.running
    const state = status?.state || {}
    const progressByKey = running ? run?.datasets || {} : {}

    const usable = datasets.filter((dataset) => {
        const config = connection.datasets?.[dataset.key]
        return config?.available && config.enabled && !config.missingRequired?.length
    })
    const finished = running ? Object.values(run.datasets).filter((entry) => !['pending', 'running'].includes(entry.status)).length : 0
    const total = running ? Object.keys(run.datasets).length : 0
    const lastVerified = Math.max(0, ...usable.map((dataset) => state[dataset.key]?.lastVerifiedAt || 0))
    const outOfStep = usable.filter((dataset) => state[dataset.key]?.outOfStep).length

    return (
        <div className='bc-page'>
            <StatCardGrid min={200}>
                <StatCard label='Last sync' value={formatAgo(connection.lastSyncFinishedAt)} description={connection.lastSyncFinishedAt ? formatDateTime(connection.lastSyncFinishedAt) : 'No sync has run yet'} />
                <StatCard label='Last full check' value={formatAgo(lastVerified)} description='Every row in Business Central compared with the stored copy' />
                <StatCard label='Tables out of step' value={outOfStep} tone={outOfStep ? 'error' : 'success'} description={outOfStep ? 'Row counts differ from Business Central' : 'Row counts match Business Central'} />
                <StatCard
                    label='Automatic sync'
                    value={connection.autoSync === false ? 'Off' : `Every ${connection.syncIntervalMinutes || 60} min`}
                    description={connection.verifyIntervalHours === 0 ? 'Scheduled full check is off' : `Full check every ${connection.verifyIntervalHours || 24} hr`}
                />
            </StatCardGrid>

            <section className='bc-card'>
                <div className='bc-sync-actions'>
                    <div>
                        <h3>{running ? `${MODE_LABEL[run.mode]} in progress` : 'Sync with Business Central'}</h3>
                        {running ? (
                            <p className='bc-muted'>
                                {finished} of {total} tables done.
                                {' '}{run.totals.fetched.toLocaleString()} rows read, {run.totals.scanned.toLocaleString()} checked,
                                {' '}{(run.totals.changed + run.totals.removed).toLocaleString()} differences found.
                            </p>
                        ) : (
                            <p className='bc-muted'>
                                Sync reads what is new. Check for changes also compares every existing row with Business Central.
                                Full reload reads everything again from the start.
                            </p>
                        )}
                    </div>
                    <div className='bc-actions'>
                        {running ? (
                            <button type='button' className='bc-button bc-button-danger' disabled={busy} onClick={onCancel}>Cancel</button>
                        ) : (
                            <>
                                <button type='button' className='bc-button bc-button-primary' disabled={busy || !usable.length} onClick={() => onStart('incremental')}>Sync now</button>
                                <button type='button' className='bc-button' disabled={busy || !usable.length} onClick={() => onStart('verify')}>Check for changes</button>
                                {canManage && <button type='button' className='bc-button' disabled={busy || !usable.length} onClick={() => onStart('full')}>Full reload</button>}
                            </>
                        )}
                    </div>
                </div>
                {running && (
                    <div className='bc-progress' role='progressbar' aria-valuemin={0} aria-valuemax={total} aria-valuenow={finished}>
                        <div style={{ width: `${total ? (finished / total) * 100 : 0}%` }} />
                    </div>
                )}
                {!running && run?.status && run.status !== 'completed' && (
                    <div className={`bc-banner ${run.status === 'cancelled' ? 'bc-banner-info' : 'bc-banner-error'}`}>
                        The last run ended as "{RUN_STATUS[run.status] || run.status}"{run.error ? `: ${run.error}` : '.'}
                    </div>
                )}
                {!usable.length && (
                    <div className='bc-banner bc-banner-info'>
                        No table is ready to sync.
                        {' '}{canManage
                            ? <button type='button' className='bc-link-button' onClick={() => onGoTo('connection')}>Open Connection</button>
                            : 'Ask an admin to finish the connection setup.'}
                    </div>
                )}
            </section>

            {GROUP_ORDER.map((group) => {
                const rows = datasets.filter((dataset) => dataset.group === group && connection.datasets?.[dataset.key]?.available)
                if (!rows.length) return null
                return (
                    <section key={group} className='bc-card'>
                        <h3>{GROUP_LABEL[group]}</h3>
                        <div className='bc-table-scroll'>
                            <table className='bc-table'>
                                <thead>
                                    <tr>
                                        <th>Table</th>
                                        <th className='bc-num'>Rows</th>
                                        <th>Last synced</th>
                                        <th>Last full check</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((dataset) => {
                                        const datasetState = state[dataset.key] || {}
                                        const progress = progressByKey[dataset.key]
                                        const description = describeDataset(connection.datasets[dataset.key], datasetState, progress)
                                        return (
                                            <tr key={dataset.key}>
                                                <td>{dataset.label}</td>
                                                <td className='bc-num'>{datasetState.rowCount !== undefined ? datasetState.rowCount.toLocaleString() : ''}</td>
                                                <td>{formatAgo(datasetState.lastSyncedAt)}</td>
                                                <td>{formatAgo(datasetState.lastVerifiedAt)}</td>
                                                <td>
                                                    <span className={`bc-status bc-status-${description.tone}`}>{description.text}</span>
                                                    {progress?.status === 'running' && (
                                                        <span className='bc-sub'>{progress.fetched.toLocaleString()} read, {progress.scanned.toLocaleString()} checked</span>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )
            })}

            <section className='bc-card'>
                <h3>Recent runs</h3>
                {history.length === 0 ? <p className='bc-empty'>No runs yet.</p> : (
                    <div className='bc-table-scroll'>
                        <table className='bc-table'>
                            <thead>
                                <tr>
                                    <th>Started</th>
                                    <th>Type</th>
                                    <th>Started by</th>
                                    <th>Took</th>
                                    <th className='bc-num'>Rows read</th>
                                    <th className='bc-num'>New</th>
                                    <th className='bc-num'>Changed</th>
                                    <th className='bc-num'>Removed</th>
                                    <th>Result</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.map((entry) => (
                                    <tr key={entry.id}>
                                        <td>{formatDateTime(entry.startedAt)}</td>
                                        <td>{MODE_LABEL[entry.mode] || entry.mode}</td>
                                        <td>{entry.trigger === 'schedule' ? 'Schedule' : (entry.startedBy || 'Manual')}</td>
                                        <td>{entry.finishedAt ? formatDuration(entry.finishedAt - entry.startedAt) : ''}</td>
                                        <td className='bc-num'>{entry.totals.fetched.toLocaleString()}</td>
                                        <td className='bc-num'>{entry.totals.added.toLocaleString()}</td>
                                        <td className='bc-num'>{entry.totals.changed.toLocaleString()}</td>
                                        <td className='bc-num'>{entry.totals.removed.toLocaleString()}</td>
                                        <td><span className={`bc-status bc-status-${statusTone(entry.status)}`}>{RUN_STATUS[entry.status] || entry.status}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    )
}

export default BCSync
