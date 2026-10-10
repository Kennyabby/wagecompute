import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import ContextProvider from '../../Resources/ContextProvider'
import BCDataTable from './BCDataTable'
import BCDrillModal from './BCDrillModal'
import { companyInfoFrom, dateRangeFrom, exportTable } from './bcExport'
import BCFilterBar, { initialFilterValues } from './BCFilterBar'
import { formatValue } from './bcFormat'
import BCPreparing, { BCUpdating, usePreparingRetry } from './BCPreparing'

const REPORT_KEY = 'transactionHistory'
const PAGE_SIZES = [25, 50, 100, 250]

const quantity = (value) => formatValue(value, 'qty') || '0'
const money = (value) => formatValue(value, 'money') || '0.00'
const signed = (value) => `${value > 0 ? '+' : ''}${quantity(value)}`

// The summary cards, in the order stock flows: what was there, what came in
// and went out, what is left. `value` is the headline, `lines` the detail
// under it, and `figure` the number a click on the card breaks down.
const cardsFrom = (summary) => [
    { key: 'openingStock', label: 'Opening stock', value: quantity(summary.openingStock), figure: summary.openingStock, lines: [`Cost: ${money(summary.openingStockCost)}`] },
    { key: 'purchases', label: 'Purchases', tone: 'in', value: signed(summary.purchases), figure: summary.purchases, lines: [`Cost: ${money(summary.purchasesCost)}`] },
    { key: 'sales', label: 'Sales', tone: 'out', value: quantity(summary.sales), figure: summary.sales, lines: [`Value: ${money(summary.salesValue)}`, `Cost of goods sold: ${money(summary.costOfGoodsSold)}`] },
    {
        key: 'transfers', label: 'Transfers', value: `${signed(summary.transfersIn)} / ${quantity(summary.transfersOut)}`, figure: summary.transfersIn + summary.transfersOut,
        lines: [`In: ${money(summary.transfersInCost)}`, `Out: ${money(summary.transfersOutCost)}`, `Net: ${money(summary.netTransferCost)}`],
    },
    {
        key: 'adjustments', label: 'Adjustments', value: `${signed(summary.positiveAdjustments)} / ${quantity(summary.negativeAdjustments)}`, figure: summary.positiveAdjustments + summary.negativeAdjustments,
        lines: [`Positive: ${money(summary.positiveAdjustmentsCost)}`, `Negative: ${money(summary.negativeAdjustmentsCost)}`, `Net: ${money(summary.netAdjustmentCost)}`],
    },
    {
        key: 'production', label: 'Production', value: `${signed(summary.produced)} / ${quantity(summary.consumed)}`, figure: summary.produced + summary.consumed,
        lines: [`Output: ${money(summary.producedCost)}`, `Consumed: ${money(summary.consumedCost)}`, `Net: ${money(summary.netProductionCost)}`],
    },
    { key: 'closingStock', label: 'Closing stock', tone: 'total', value: quantity(summary.closingStock), figure: summary.closingStock, lines: [`Cost: ${money(summary.closingStockCost)}`, `Average cost: ${money(summary.averageCost)}`] },
]

/**
 * Item transactions from Business Central, laid out like the inventory
 * Transaction History screen: filters, stock summary cards that open the
 * items and locations behind them, and the list of transactions.
 */
const BCTransactions = ({ api, lookups, lastSyncedAt, onLoaded, onGoTo }) => {
    const context = useContext(ContextProvider)
    const { setAlert, setAlertState, setAlertTimeout } = context
    const [definition, setDefinition] = useState(null)
    const [unavailable, setUnavailable] = useState('')
    const [values, setValues] = useState(null)
    const [report, setReport] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [drill, setDrill] = useState(null)
    const [duplicatesOnly, setDuplicatesOnly] = useState(false)
    const [view, setView] = useState(null)
    const [exporting, setExporting] = useState('')
    const { preparing, updating, awaitData } = usePreparingRetry()

    // The filters come with the report's definition, like every other report.
    useEffect(() => {
        let active = true
        api.getReports().then((catalogue) => {
            if (!active) return
            const found = catalogue.reports.find((entry) => entry.key === REPORT_KEY)
            if (!found) { setUnavailable('This server does not offer the transaction history yet.'); return }
            if (!found.available) { setUnavailable(found.reason); return }
            setUnavailable('')
            setDefinition(found)
            setValues((current) => current || initialFilterValues(found.filters))
        }).catch((failure) => { if (active) setError(failure.message) })
        return () => { active = false }
    }, [api])

    const run = useCallback(async (params) => {
        setLoading(true)
        setError('')
        try {
            const response = await awaitData(() => api.runReport(REPORT_KEY, params), (fresh) => setReport(fresh.report))
            setDrill(null)
            setReport(response.report)
            if (onLoaded) onLoaded()
        } catch (failure) {
            setError(failure.message)
        } finally {
            setLoading(false)
        }
    }, [api, awaitData, onLoaded])

    // Runs when the page opens and again when Business Central changes.
    // Typing in a filter does not fetch until Apply is pressed.
    const ready = !!definition && !!values
    useEffect(() => {
        if (ready) run(values)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [run, ready, lastSyncedAt])

    const reset = () => {
        const cleared = initialFilterValues(definition.filters)
        setValues(cleared)
        setDuplicatesOnly(false)
        run(cleared)
    }

    const summary = report?.meta?.summary
    const cards = useMemo(() => (summary ? cardsFrom(summary) : []), [summary])
    const rows = useMemo(() => (report ? (duplicatesOnly ? report.rows.filter((row) => row.duplicate) : report.rows) : []), [report, duplicatesOnly])
    const onView = useCallback((next) => setView(next), [])

    const openCard = (card) => setDrill({
        column: { key: card.key, label: card.label, type: 'qty' },
        row: { [card.key]: card.figure, _key: {} },
        caption: '',
    })

    const runExport = async (kind) => {
        setExporting(kind)
        try {
            await exportTable({
                kind,
                title: 'Transaction History (Business Central)',
                columns: view?.columns || report.columns,
                rows: view?.rows || rows,
                totals: view?.totals || report.totals,
                dateRange: dateRangeFrom(report.params),
                filters: {
                    ...(duplicatesOnly ? { Showing: 'Possible duplicates only' } : {}),
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

    if (unavailable) {
        return (
            <div className='bc-page'>
                <div className='bc-card bc-first-sync'>
                    <h3>Transaction history is not available yet</h3>
                    <p className='bc-muted'>{unavailable}</p>
                    <button type='button' className='bc-button bc-button-primary' onClick={() => onGoTo('dashboard')}>See what to publish</button>
                </div>
            </div>
        )
    }

    return (
        <div className='bc-page'>
            {definition && values && (
                <BCFilterBar filters={definition.filters} values={values} onChange={setValues} lookups={lookups} onSubmit={() => run(values)} submitLabel='Apply filters' busy={loading}>
                    <button type='button' className='bc-button' disabled={loading} onClick={reset}>Reset</button>
                    <button type='button' className='bc-button' disabled={loading} onClick={() => run(values)} title='Read again with the same filters'>Refresh</button>
                </BCFilterBar>
            )}

            {error && <div className='bc-banner bc-banner-error'>{error}</div>}
            <BCPreparing progress={preparing} />
            <BCUpdating since={updating} />
            {!report && loading && !preparing && <p className='bc-empty'>Loading transactions...</p>}

            {report && summary && (
                <div className={`bc-page ${loading ? 'bc-stale' : ''}`}>
                    <div className='bc-th-cards'>
                        {cards.map((card) => (
                            <button key={card.key} type='button' className={`bc-th-card ${card.tone ? `bc-th-${card.tone}` : ''}`} title={`See the items and locations behind ${card.label.toLowerCase()}`} onClick={() => openCard(card)}>
                                <span className='bc-th-label'>{card.label}</span>
                                <strong className='bc-th-value'>{card.value}</strong>
                                {card.lines.map((line) => <span key={line} className='bc-th-line'>{line}</span>)}
                            </button>
                        ))}
                        <div className='bc-th-card'>
                            <span className='bc-th-label'>Possible duplicate sales</span>
                            <strong className='bc-th-value'>{(report.meta.duplicates || 0).toLocaleString()}</strong>
                            <span className='bc-th-line'>Same item, quantity, place, day and customer</span>
                            <span className='bc-th-actions'>
                                <button type='button' className='bc-button' disabled={!report.meta.duplicates} onClick={() => setDuplicatesOnly((current) => !current)}>
                                    {duplicatesOnly ? 'Show all transactions' : 'Show only these'}
                                </button>
                                <button type='button' className='bc-link-button' disabled={!report.meta.duplicates} onClick={() => openCard({ key: 'duplicates', label: 'Possible duplicate sales', figure: report.meta.duplicates })}>Open as a list</button>
                            </span>
                        </div>
                    </div>

                    {report.meta.note && <div className='bc-banner bc-banner-info'>{report.meta.note}</div>}

                    <section className='bc-card'>
                        <div className='bc-report-head'>
                            <div>
                                <h3>Transaction history</h3>
                                <p className='bc-muted'>
                                    {report.meta.total > report.meta.listed
                                        ? `${report.meta.listed.toLocaleString()} of ${report.meta.total.toLocaleString()} transactions listed.`
                                        : `${report.meta.listed.toLocaleString()} ${report.meta.listed === 1 ? 'transaction' : 'transactions'}.`}
                                    {' '}Click a column heading to sort, or use the boxes under the headings to filter.
                                </p>
                            </div>
                            <div className='bc-actions'>
                                <button type='button' className='bc-button' disabled={!rows.length || !!exporting} onClick={() => runExport('excel')}>{exporting === 'excel' ? 'Exporting...' : 'Export Excel'}</button>
                                <button type='button' className='bc-button' disabled={!rows.length || !!exporting} onClick={() => runExport('pdf')}>{exporting === 'pdf' ? 'Exporting...' : 'Export PDF'}</button>
                            </div>
                        </div>
                        <BCDataTable columns={report.columns} rows={rows} totals={report.totals} filterable manageColumns pageSizes={PAGE_SIZES} onView={onView} />
                    </section>
                </div>
            )}

            {drill && report && (
                <BCDrillModal
                    api={api}
                    report={{ ...report, title: 'Transaction History' }}
                    target={drill}
                    filters={{}}
                    onClose={() => setDrill(null)}
                />
            )}
        </div>
    )
}

export default BCTransactions
