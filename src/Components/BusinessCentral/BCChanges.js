import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { formatDateTime } from './bcFormat'

const TYPE_LABEL = { added: 'New', changed: 'Changed', removed: 'Removed' }
const TYPE_TONE = { added: 'info', changed: 'warn', removed: 'error' }

const showValue = (value) => {
    if (value === null || value === undefined || value === '') return '(blank)'
    if (typeof value === 'boolean') return value ? 'Yes' : 'No'
    return typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 5 }) : String(value)
}

const fieldLabel = (field) => field.replace(/_/g, ' ')

// One page of changes at a time, for a table and kind of difference, with
// "Show older" adding the next page. Used by the list on the page and by the
// pop-up a table's View button opens.
const useChangeList = (api, dataset, type) => {
    const [changes, setChanges] = useState([])
    const [hasMore, setHasMore] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [meta, setMeta] = useState({ summary: [], summaryDays: 30 })

    const load = useCallback(async (before) => {
        setLoading(true)
        setError('')
        try {
            const response = await api.getChanges({ dataset, type, before, limit: 50 })
            setChanges((current) => (before ? [...current, ...response.changes] : response.changes))
            setHasMore(response.hasMore)
            setMeta({ summary: response.summary, summaryDays: response.summaryDays })
        } catch (failure) {
            setError(failure.message)
        } finally {
            setLoading(false)
        }
    }, [api, dataset, type])

    return { changes, hasMore, loading, error, meta, load }
}

const TypeFilter = ({ value, onChange }) => (
    <label className='bc-field'>
        <span className='bc-field-label'>Kind of difference</span>
        <select className='bc-input' value={value} onChange={(event) => onChange(event.target.value)}>
            <option value=''>All</option>
            <option value='changed'>Changed</option>
            <option value='removed'>Removed</option>
            <option value='added'>New</option>
        </select>
    </label>
)

const ChangeList = ({ list }) => {
    const [expanded, setExpanded] = useState({})
    const { changes, hasMore, loading, error, load } = list
    return (
        <>
            {error && <div className='bc-banner bc-banner-error'>{error}</div>}
            {loading && changes.length === 0 && <p className='bc-muted'>Loading...</p>}
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
        </>
    )
}

// What a table's View button opens: that table's changes in a pop-up over the
// page, with the same filter and values as the list below.
const BCChangesModal = ({ api, entry, summaryDays, onClose }) => {
    const [type, setType] = useState('')
    const list = useChangeList(api, entry.dataset, type)
    const closeButton = useRef(null)
    const { load } = list

    useEffect(() => { load() }, [load])

    // Escape closes, focus starts on Close and goes back to View afterwards.
    useEffect(() => {
        const onKey = (event) => { if (event.key === 'Escape') onClose() }
        document.addEventListener('keydown', onKey)
        const previous = document.activeElement
        closeButton.current?.focus()
        return () => {
            document.removeEventListener('keydown', onKey)
            if (previous && previous.focus) previous.focus()
        }
    }, [onClose])

    const heading = `Changes in ${entry.label}`
    // On the page body so it sits above the side menu and the top banner.
    return createPortal((
        <div className='bc-modal-backdrop' onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
            <div className='bc-modal' role='dialog' aria-modal='true' aria-label={heading}>
                <header className='bc-modal-head'>
                    <div>
                        <h2>{heading}</h2>
                        <p className='bc-muted'>
                            {`Last ${summaryDays} days: ${entry.added.toLocaleString()} new, ${entry.changed.toLocaleString()} changed, ${entry.removed.toLocaleString()} removed. Most recent ${formatDateTime(entry.lastAt)}.`}
                        </p>
                    </div>
                    <div className='bc-actions'>
                        <button type='button' className='bc-button' ref={closeButton} onClick={onClose}>Close</button>
                    </div>
                </header>
                <div className='bc-modal-body'>
                    <div className='bc-filter-bar bc-filter-bar-plain'>
                        <TypeFilter value={type} onChange={setType} />
                    </div>
                    <ChangeList key={type} list={list} />
                </div>
            </div>
        </div>
    ), document.body)
}

/**
 * The record of every row found to differ between Business Central and the
 * copy held here: rows that appeared, rows whose values changed (with the old
 * and new value of each field), and rows that were deleted in Business Central.
 */
const BCChanges = ({ api, datasets, lastSyncedAt, onGoTo }) => {
    const [dataset, setDataset] = useState('')
    const [type, setType] = useState('')
    const [viewing, setViewing] = useState(null)
    const list = useChangeList(api, dataset, type)
    const { load, meta } = list
    const { summary, summaryDays } = meta
    const closeView = useCallback(() => setViewing(null), [])

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
                                        <td><button type='button' className='bc-link-button' aria-label={`View changes in ${entry.label}`} onClick={() => setViewing(entry)}>View</button></td>
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
                    <TypeFilter value={type} onChange={setType} />
                </div>
                <ChangeList key={`${dataset}|${type}`} list={list} />
            </section>

            {viewing && <BCChangesModal api={api} entry={viewing} summaryDays={summaryDays} onClose={closeView} />}
        </div>
    )
}

export default BCChanges
