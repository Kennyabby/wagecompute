import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import ContextProvider from '../../Resources/ContextProvider'
import BCDataTable from './BCDataTable'
import BCPreparing, { BCUpdating, usePreparingRetry } from './BCPreparing'
import { companyInfoFrom, dateRangeFrom, exportTable } from './bcExport'
import { formatValue } from './bcFormat'

/**
 * The breakdown behind one figure of a report: the ledger or value entries
 * that add up to it, with totals and Excel and PDF export.
 *
 * `target` is { column, row, caption }: the column definition and row that
 * were clicked, and a short description of the row for the heading.
 */
// What one row of a breakdown is called, by kind.
const unitOf = (kind, count) => {
    if (kind === 'values') return count === 1 ? 'value entry' : 'value entries'
    if (kind === 'entries') return count === 1 ? 'ledger entry' : 'ledger entries'
    return count === 1 ? 'line' : 'lines'
}

const BCDrillModal = ({ api, report, target, filters, onClose }) => {
    const context = useContext(ContextProvider)
    const { setAlert, setAlertState, setAlertTimeout } = context
    const [breakdown, setBreakdown] = useState(null)
    const [error, setError] = useState('')
    const [exporting, setExporting] = useState('')
    // What the table is showing after its column filters: exports use this,
    // so a file always matches the screen.
    const [view, setView] = useState(null)
    const onView = useCallback((next) => setView(next), [])
    const { preparing, updating, awaitData } = usePreparingRetry()
    const closeButton = useRef(null)

    const { column, row, caption } = target
    const heading = `${column.label}${caption ? `: ${caption}` : ''}`
    const figure = formatValue(row[column.key], column.type)

    useEffect(() => {
        setBreakdown(null)
        setView(null)
        setError('')
        awaitData(() => api.drillReport(report.key, report.params, { column: column.key, row: row._key || {} }), (fresh) => setBreakdown(fresh.breakdown))
            .then((response) => setBreakdown(response.breakdown))
            .catch((failure) => setError(failure.message))
    }, [api, awaitData, report.key, report.params, column.key, row])

    // Escape closes, focus starts on Close, and the page behind does not scroll.
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

    const runExport = async (kind) => {
        setExporting(kind)
        try {
            await exportTable({
                kind,
                title: `${report.title} - ${heading} (Business Central)`,
                columns: view?.columns || breakdown.columns,
                rows: view?.rows || breakdown.rows,
                totals: view?.totals || breakdown.totals,
                dateRange: dateRangeFrom(report.params),
                filters: {
                    ...filters,
                    'Figure in report': figure,
                    ...Object.fromEntries(Object.entries(view?.filters || {}).map(([label, value]) => [`Filtered by ${label}`, value])),
                },
                companyInfo: companyInfoFrom(context),
            })
        } catch (failure) {
            setAlertState('error')
            setAlert('The export could not be created. Please try again.')
            setAlertTimeout(5000)
        } finally {
            setExporting('')
        }
    }

    const hasRows = breakdown?.rows.length > 0
    const canExport = hasRows && (!view || view.rows.length > 0)
    const exportHint = view?.filtered ? 'Exports the filtered rows and their totals' : undefined
    // Rendered on the page body, outside the module, so it sits above the
    // side menu and the top banner instead of being cut off by them.
    return createPortal((
        <div className='bc-modal-backdrop' onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
            <div className='bc-modal' role='dialog' aria-modal='true' aria-label={heading}>
                <header className='bc-modal-head'>
                    <div>
                        <h2>{heading}</h2>
                        <p className='bc-muted'>
                            {report.title}. Figure in the report: <strong>{figure}</strong>
                            {breakdown ? `, made up of ${breakdown.meta.rowCount.toLocaleString()} ${unitOf(breakdown.kind, breakdown.meta.rowCount)}.` : '.'}
                        </p>
                    </div>
                    <div className='bc-actions'>
                        <button type='button' className='bc-button' disabled={!canExport || !!exporting} title={exportHint} onClick={() => runExport('excel')}>{exporting === 'excel' ? 'Exporting...' : 'Export Excel'}</button>
                        <button type='button' className='bc-button' disabled={!canExport || !!exporting} title={exportHint} onClick={() => runExport('pdf')}>{exporting === 'pdf' ? 'Exporting...' : 'Export PDF'}</button>
                        <button type='button' className='bc-button' ref={closeButton} onClick={onClose}>Close</button>
                    </div>
                </header>

                <div className='bc-modal-body'>
                    {error && <div className='bc-banner bc-banner-error'>{error}</div>}
                    <BCPreparing progress={preparing} />
                    <BCUpdating since={updating} />
                    {!breakdown && !error && !preparing && <p className='bc-empty'>Loading the breakdown...</p>}
                    {breakdown && (
                        <>
                            {breakdown.meta.note && <div className='bc-banner bc-banner-info'>{breakdown.meta.note}</div>}
                            {hasRows
                                ? <BCDataTable columns={breakdown.columns} rows={breakdown.rows} totals={breakdown.totals} filterable manageColumns onView={onView} />
                                : <p className='bc-empty'>No entries were found behind this figure.</p>}
                        </>
                    )}
                </div>
            </div>
        </div>
    ), document.body)
}

export default BCDrillModal
