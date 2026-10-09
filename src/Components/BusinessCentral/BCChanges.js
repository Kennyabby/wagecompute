import { useCallback, useEffect, useState } from 'react'
import { formatDateTime } from './bcFormat'

const TYPE_LABEL = { added: 'New', changed: 'Changed', removed: 'Removed' }
const TYPE_TONE = { added: 'info', changed: 'warn', removed: 'error' }

const showValue = (value) => {
    if (value === null || value === undefined || value === '') return '(blank)'
    if (typeof value === 'boolean') return value ? 'Yes' : 'No'
    return typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 5 }) : String(value)
}

const fieldLabel = (field) => field.replace(/_/g, ' ')

/**
 * The record of every row found to differ between Business Central and the
 * copy held here: rows that appeared, rows whose values changed (with the old
 * and new value of each field), and rows that were deleted in Business Central.
 */
const BCChanges = ({ api, datasets, lastSyncedAt, onGoTo }) => {
    const [dataset, setDataset] = useState('')
    const [type, setType] = useState('')
    const [changes, setChanges] = useState([])
    const [summary, setSummary] = useState([])
    const [summaryDays, setSummaryDays] = useState(30)
    const [hasMore, setHasMore] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [expanded, setExpanded] = useState({})

    const load = useCallback(async (before) => {
        setLoading(true)
        setError('')
        try {
            const response = await api.getChanges({ dataset, type, before, limit: 50 })
            setChanges((current) => (before ? [...current, ...response.changes] : response.changes))
            setHasMore(response.hasMore)
            setSummary(response.summary)
            setSummaryDays(response.summaryDays)
        } catch (failure) {
            setError(failure.message)
        } finally {
            setLoading(false)
        }
    }, [api, dataset, type])

    useEffect(() => { load() }, [load, lastSyncedAt])

    return (
        <div className='bc-page'>
            <section className='bc-card'>
                <h3>Differences found in the last {summaryDays} days</h3>
                {summary.length === 0 ? (
                    <p className='bc-empty'>
                        No differences have been recorded. Each sync compares what it reads with the stored copy, and the
                        scheduled full check compares every row.
                        {' '}<button type='button' className='bc-link-button' onClick={() => onGoTo('data')}>Run a check now</button>
                    </p>
                ) : (
                    <div className='bc-table-scroll'>
                        <table className='bc-table'>
                            <thead>
                                <tr><th>Table</th><th className='bc-num'>New</th><th className='bc-num'>Changed</th><th className='bc-num'>Removed</th><th>Most recent</th><th /></tr>
                            </thead>
                            <tbody>
                                {summary.map((entry) => (
                                    <tr key={entry.dataset}>
                                        <td>{entry.label}</td>
                                        <td className='bc-num'>{entry.added.toLocaleString()}</td>
                                        <td className='bc-num'>{entry.changed.toLocaleString()}</td>
                                        <td className='bc-num'>{entry.removed.toLocaleString()}</td>
                                        <td>{formatDateTime(entry.lastAt)}</td>
                                        <td><button type='button' className='bc-link-button' onClick={() => { setDataset(entry.dataset); setType('') }}>View</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                <p className='bc-muted'>
                    New ledger entries are normal activity and are counted on each run under Data Sync, not listed here.
                    Calculated fields such as stock on hand and balances are ignored when deciding whether a record changed.
                </p>
            </section>

            <section className='bc-card'>
                <div className='bc-filter-bar bc-filter-bar-plain'>
                    <label className='bc-field'>
                        <span className='bc-field-label'>Table</span>
                        <select className='bc-input' value={dataset} onChange={(event) => setDataset(event.target.value)}>
                            <option value=''>All tables</option>
                            {datasets.map((entry) => <option key={entry.key} value={entry.key}>{entry.label}</option>)}
                        </select>
                    </label>
                    <label className='bc-field'>
                        <span className='bc-field-label'>Kind of difference</span>
                        <select className='bc-input' value={type} onChange={(event) => setType(event.target.value)}>
                            <option value=''>All</option>
                            <option value='changed'>Changed</option>
                            <option value='removed'>Removed</option>
                            <option value='added'>New</option>
                        </select>
                    </label>
                </div>

                {error && <div className='bc-banner bc-banner-error'>{error}</div>}
                {changes.length === 0 && !loading && !error && <p className='bc-empty'>No differences match this filter.</p>}

                <ul className='bc-change-list'>
                    {changes.map((change) => {
                        const open = !!expanded[change.id]
                        const canExpand = change.type === 'changed' && change.fields.length > 0
                        return (
                            <li key={change.id}>
                                <div className='bc-change-row'>
                                    <span className={`bc-status bc-status-${TYPE_TONE[change.type]}`}>{TYPE_LABEL[change.type]}</span>
                                    <div className='bc-change-main'>
                                        <strong>{change.label}</strong>
                                        <span className='bc-sub'>
                                            {change.datasetLabel}
                                            {change.type === 'changed' && `, ${change.fieldCount} field${change.fieldCount === 1 ? '' : 's'}: ${change.fields.slice(0, 4).map((field) => fieldLabel(field.field)).join(', ')}${change.fieldCount > 4 ? ' and more' : ''}`}
                                        </span>
                                    </div>
                                    <span className='bc-muted'>{formatDateTime(change.at)}</span>
                                    {canExpand && (
                                        <button type='button' className='bc-link-button' aria-expanded={open} onClick={() => setExpanded((current) => ({ ...current, [change.id]: !open }))}>
                                            {open ? 'Hide values' : 'Show values'}
                                        </button>
                                    )}
                                </div>
                                {open && (
                                    <table className='bc-table bc-change-fields'>
                                        <thead><tr><th>Field</th><th>Stored before</th><th>Now in Business Central</th></tr></thead>
                                        <tbody>
                                            {change.fields.map((field) => (
                                                <tr key={field.field}>
                                                    <td>{fieldLabel(field.field)}</td>
                                                    <td>{showValue(field.before)}</td>
                                                    <td>{showValue(field.after)}</td>
                                                </tr>
                                            ))}
                                            {change.fieldCount > change.fields.length && (
                                                <tr><td colSpan={3} className='bc-muted'>{change.fieldCount - change.fields.length} more fields changed.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                )}
                            </li>
                        )
                    })}
                </ul>

                {hasMore && (
                    <button type='button' className='bc-button' disabled={loading} onClick={() => load(changes[changes.length - 1].id)}>
                        {loading ? 'Loading...' : 'Show older'}
                    </button>
                )}
            </section>
        </div>
    )
}

export default BCChanges
