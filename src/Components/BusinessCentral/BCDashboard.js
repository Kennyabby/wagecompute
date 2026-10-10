import { useCallback, useEffect, useState } from 'react'
import BCPreparing, { BCUpdating, usePreparingRetry } from './BCPreparing'
import StatCard from '../Shared/ui/StatCard'
import StatCardGrid from '../Shared/ui/StatCardGrid'
import BCChart from './BCChart'
import BCFilterBar, { initialFilterValues } from './BCFilterBar'
import { formatKpi, formatValue, formatAgo } from './bcFormat'

const describeChange = (change, comparedWith) => {
    if (change === null || change === undefined) return ''
    const direction = change > 0 ? 'Up' : change < 0 ? 'Down' : 'No change'
    const amount = change === 0 ? '' : ` ${Math.abs(change).toLocaleString(undefined, { maximumFractionDigits: 1 })}%`
    return `${direction}${amount} on the ${comparedWith.days} days before`
}

// `cost` marks a tile where a negative figure is not a mistake: it is a net
// credit, and the tile says so instead of leaving a minus sign unexplained.
const FINANCIAL = [
    { key: 'revenue', label: 'Total revenue' },
    { key: 'cogs', label: 'Cost of goods sold', sign: 'less', cost: true },
    { key: 'adjustments', label: 'Inventory adjustments', sign: 'less', cost: true, when: 'hasAdjustments', link: 'adjustmentsLink' },
    { key: 'otherCosts', label: 'Other costs', sign: 'less', cost: true, when: 'hasOtherCosts' },
    { key: 'grossProfit', label: 'Gross profit', sign: 'equals', result: true },
    { key: 'expenses', label: 'Total expenses', sign: 'less' },
    { key: 'netProfit', label: 'Net profit', sign: 'equals', result: true },
]
const SIGN = { less: 'less', equals: 'gives' }

/**
 * Revenue, cost of goods sold, gross profit, expenses and net profit from the
 * general ledger, in the order one leads to the next, followed by the steps
 * in full so the net profit can be traced back to what it is made of.
 */
// An answer kept from before figures carried a sign has only `amount`.
const signedOf = (figure) => (figure.signed === undefined ? figure.amount : figure.signed)

const FinancialSummary = ({ financial, comparedWith, onOpen, onOpenReport }) => {
    const [open, setOpen] = useState(false)
    // A chart with no cost-of-sales section goes straight from revenue to
    // expenses, and tiles for kinds of cost the chart does not have are left off.
    const cards = FINANCIAL.filter((card) => (financial.hasCostOfSales || (card.key !== 'cogs' && card.key !== 'grossProfit')) && (!card.when || financial[card.when]))
    const openCard = (card) => (card.link && financial[card.link] ? onOpenReport(financial[card.link].report, financial[card.link].params) : onOpen())
    return (
        <section className='bc-card bc-financial'>
            <header className='bc-chart-head'>
                <h3>Profit for the period</h3>
                <span className='bc-chart-actions'>
                    <button type='button' className='bc-link-button' aria-expanded={open} onClick={() => setOpen((current) => !current)}>{open ? 'Hide the working' : 'How net profit was reached'}</button>
                    <button type='button' className='bc-link-button' onClick={onOpen}>Open income statement</button>
                </span>
            </header>
            <div className='bc-financial-row'>
                {cards.map((card) => {
                    const value = financial[card.key]
                    const tone = card.result ? (value >= 0 ? 'bc-profit' : 'bc-loss') : ''
                    return (
                        <button key={card.key} type='button' className={`bc-financial-card ${card.result ? 'bc-financial-result' : ''}`} onClick={() => openCard(card)} title={card.link ? 'See the positive and negative postings, account by account' : 'Open the income statement for this period'}>
                            {card.sign && <span className='bc-financial-sign' aria-hidden='true'>{card.sign === 'less' ? '\u2212' : '='}</span>}
                            <span className='bc-th-label'>{card.sign ? <span className='bc-visually-hidden'>{SIGN[card.sign]} </span> : null}{card.label}</span>
                            <strong className={`bc-financial-amount ${tone}`} title={formatValue(value, 'money')}>{formatKpi(value, 'money')}</strong>
                            <span className='bc-th-line'>
                                {card.key === 'grossProfit' ? `Margin ${formatValue(financial.grossMargin, 'percent')}` : ''}
                                {card.key === 'netProfit' ? `Margin ${formatValue(financial.netMargin, 'percent')}` : ''}
                                {card.cost && value < 0 ? 'A net credit: it adds to profit. ' : ''}
                                {card.key === 'adjustments' ? 'Click for positive, negative and detail' : ''}
                                {card.key !== 'grossProfit' && card.key !== 'netProfit' && card.key !== 'adjustments' ? describeChange(financial.change?.[card.key], comparedWith) : ''}
                            </span>
                        </button>
                    )
                })}
            </div>
            {open && (
                <div className='bc-table-scroll'>
                    <table className='bc-table bc-working'>
                        <thead><tr><th>Step</th><th>Made up of</th><th className='bc-num'>Amount</th></tr></thead>
                        <tbody>
                            {financial.steps.map((step, index) => [
                                <tr key={`step-${index}`} className={step.kind === 'subtotal' || step.kind === 'total' ? 'bc-row-strong' : ''}>
                                    <td>{step.kind === 'less' ? 'Less: ' : (step.kind === 'income' ? '' : 'Gives: ')}{step.label}</td>
                                    <td />
                                    <td className={`bc-num ${step.kind === 'total' || step.kind === 'subtotal' ? (signedOf(step) >= 0 ? 'bc-pos' : 'bc-neg') : ''}`}>
                                        {/* A cost is in brackets. A cost that came out negative is a credit, shown with a plus. */}
                                        {step.kind === 'less' ? (signedOf(step) < 0 ? `+${formatValue(-signedOf(step), 'money')}` : `(${formatValue(signedOf(step), 'money')})`) : formatValue(signedOf(step), 'money')}
                                    </td>
                                </tr>,
                                ...(step.parts.length > 1 ? step.parts.map((part) => (
                                    <tr key={`part-${index}-${part.no}`} className='bc-working-part'>
                                        <td />
                                        <td>{part.label}</td>
                                        <td className='bc-num'>{formatValue(signedOf(part), 'money')}</td>
                                    </tr>
                                )) : []),
                            ])}
                        </tbody>
                    </table>
                    <p className='bc-muted'>From the general ledger. Open the income statement to see every account, and click a figure there for its entries.</p>
                </div>
            )}
        </section>
    )
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const MONTHLY_COLUMNS = [
    { key: 'revenue', label: 'Revenue' },
    { key: 'cogs', label: 'Cost of goods sold' },
    { key: 'adjustments', label: 'Inventory adjustments', optional: true },
    { key: 'otherCosts', label: 'Other costs', optional: true },
    { key: 'grossProfit', label: 'Gross profit' },
    { key: 'expenses', label: 'Expenses' },
    { key: 'netProfit', label: 'Net profit' },
]

/**
 * Revenue, cost of goods sold, expenses and net profit month by month for
 * one year, as a chart and as a table. Clicking a year shows that year,
 * with the dashboard's branch filter still applied.
 */
const MonthlyPerformance = ({ api, monthly, branches }) => {
    const [year, setYear] = useState(monthly.year)
    const [rows, setRows] = useState(monthly.rows)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const { preparing, awaitData } = usePreparingRetry()

    const choose = async (next) => {
        if (next === year || loading) return
        setYear(next)
        setError('')
        if (next === monthly.year) { setRows(monthly.rows); return }
        setLoading(true)
        try {
            const response = await awaitData(() => api.getMonthly({ year: next, branches }), (fresh) => setRows(fresh.monthly.rows))
            setRows(response.monthly.rows)
        } catch (failure) {
            setError(failure.message)
        } finally {
            setLoading(false)
        }
    }

    // Columns for kinds of cost this company never posts are left out.
    const columns = MONTHLY_COLUMNS.filter((column) => !column.optional || rows.some((row) => row[column.key]))
    const totals = Object.fromEntries(columns.map((column) => [column.key, rows.reduce((sum, row) => sum + (row[column.key] || 0), 0)]))
    const withAdjustments = columns.some((column) => column.key === 'adjustments')
    const chart = {
        key: 'monthly',
        title: `Monthly performance, ${year}`,
        type: 'bar',
        wide: true,
        xKey: 'period',
        format: 'money',
        series: [{ key: 'revenue', label: 'Revenue' }, { key: 'cogs', label: 'Cost of goods sold' }, ...(withAdjustments ? [{ key: 'adjustments', label: 'Inventory adjustments' }] : []), { key: 'expenses', label: 'Expenses' }, { key: 'netProfit', label: 'Net profit' }],
        data: rows.map((row) => ({ period: row.month, revenue: row.revenue, cogs: row.cogs, ...(withAdjustments ? { adjustments: row.adjustments } : {}), expenses: row.expenses, netProfit: row.netProfit })),
    }
    return (
        <section className='bc-card bc-monthly'>
            <header className='bc-chart-head'>
                <h3>Monthly performance</h3>
                <div className='bc-year-picker' role='group' aria-label='Year'>
                    {monthly.years.map((entry) => (
                        <button key={entry} type='button' className={entry === year ? 'active' : ''} aria-pressed={entry === year} disabled={loading} onClick={() => choose(entry)}>{entry}</button>
                    ))}
                </div>
            </header>
            {error && <div className='bc-banner bc-banner-error'>{error}</div>}
            <BCPreparing progress={preparing} />
            <div className={loading ? 'bc-stale' : ''}>
                <BCChart chart={chart} />
                <div className='bc-table-scroll'>
                    <table className='bc-table'>
                        <thead><tr><th>Month</th>{columns.map((column) => <th key={column.key} className='bc-num'>{column.label}</th>)}</tr></thead>
                        <tbody>
                            {rows.map((row) => (
                                <tr key={row.month}>
                                    <td>{MONTH_NAMES[Number(row.month.slice(5, 7)) - 1]} {row.month.slice(0, 4)}</td>
                                    {columns.map((column) => <td key={column.key} className={`bc-num ${column.key === 'netProfit' || column.key === 'grossProfit' ? (row[column.key] < 0 ? 'bc-neg' : '') : ''}`}>{formatValue(row[column.key], 'money')}</td>)}
                                </tr>
                            ))}
                            {rows.length === 0 && <tr><td colSpan={columns.length + 1} className='bc-empty'>Nothing was posted in {year}.</td></tr>}
                        </tbody>
                        {rows.length > 0 && (
                            <tfoot>
                                <tr><td>Total for {year}</td>{columns.map((column) => <td key={column.key} className='bc-num'>{formatValue(totals[column.key], 'money')}</td>)}</tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        </section>
    )
}

const BCDashboard = ({ api, lookups, lastSyncedAt, live, canManage, onOpenReport, onLoaded, onDiscovered }) => {
    const filters = [
        { key: 'dateRange', type: 'dateRange', label: 'Period' },
        { key: 'locations', type: 'multi', label: 'Location', lookup: 'locations' },
        ...(lookups?.hasBranch ? [{ key: 'branches', type: 'multi', label: 'Branch', lookup: 'branches' }] : []),
    ]
    const [values, setValues] = useState(() => initialFilterValues(filters))
    const [dashboard, setDashboard] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const { preparing, updating, awaitData } = usePreparingRetry()
    const [discovering, setDiscovering] = useState(false)
    const [discoverNote, setDiscoverNote] = useState('')

    const load = useCallback(async (params) => {
        setLoading(true)
        setError('')
        try {
            const response = await awaitData(() => api.getDashboard(params), (fresh) => setDashboard(fresh.dashboard))
            setDashboard(response.dashboard)
            if (onLoaded) onLoaded()
        } catch (failure) {
            setError(failure.message)
        } finally {
            setLoading(false)
        }
    }, [api, awaitData, onLoaded])

    // Reload when a sync finishes, so the figures follow the data without a
    // manual refresh. `values` is read at that moment, not tracked, because
    // typing in a filter should not fetch until Apply is pressed.
    useEffect(() => {
        load(values)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [load, lastSyncedAt])

    // Looks for newly published pages, then loads everything again so the
    // reports and tiles that were waiting for them appear.
    const discover = async () => {
        setDiscovering(true)
        setDiscoverNote('')
        const before = (dashboard?.missing || []).length
        try {
            await api.discover()
            if (onDiscovered) await onDiscovered()
            const response = await awaitData(() => api.getDashboard(values))
            setDashboard(response.dashboard)
            const found = before - (response.dashboard.missing || []).length
            setDiscoverNote(found > 0 ? `Found ${found} newly published ${found === 1 ? 'page' : 'pages'}.` : 'No newly published pages were found. Check the service name matches the one shown.')
        } catch (failure) {
            setDiscoverNote(failure.message)
        } finally {
            setDiscovering(false)
        }
    }

    const missing = dashboard?.missing || []
    const needed = missing.filter((entry) => !entry.optional)

    return (
        <div className='bc-page'>
            <BCFilterBar filters={filters} values={values} onChange={setValues} lookups={lookups} onSubmit={() => load(values)} submitLabel='Apply' busy={loading} />
            <p className='bc-muted bc-data-age'>
                {live ? 'Read live from Business Central.' : `Data as of the last sync: ${formatAgo(lastSyncedAt)}.`}
                {' '}Click a tile or a chart to open the report behind it.
            </p>

            {error && <div className='bc-banner bc-banner-error'>{error}</div>}
            <BCPreparing progress={preparing} />
            <BCUpdating since={updating} />
            {!dashboard && loading && !preparing && <p className='bc-empty'>Loading the dashboard...</p>}

            {dashboard && missing.length > 0 && (
                <section className='bc-card bc-missing'>
                    <header className='bc-chart-head'>
                        <h3>{needed.length ? 'Pages to publish in Business Central' : 'Optional pages not published'}</h3>
                        {canManage && (
                            <button type='button' className='bc-button bc-button-primary' disabled={discovering} onClick={discover}>
                                {discovering ? 'Looking...' : 'Discover'}
                            </button>
                        )}
                    </header>
                    <p className='bc-muted'>
                        {needed.length ? 'Some reports are waiting for these.' : 'Every report can run. These add detail.'}
                        {' '}Publish each page as a web service under the name shown, then {canManage ? 'press Discover' : 'ask an admin to press Discover'}.
                    </p>
                    <table className='bc-table'>
                        <thead><tr><th>Page</th><th>Table</th><th>Publish as (service name)</th><th>Needed for</th></tr></thead>
                        <tbody>
                            {missing.map((entry) => (
                                <tr key={entry.key}>
                                    <td>{entry.page || ''}</td>
                                    <td>{entry.label}</td>
                                    <td><code>{entry.service}</code></td>
                                    <td>{entry.optional ? `Optional. ${entry.purpose}` : entry.reports.join(', ')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {discoverNote && <p className='bc-muted' role='status'>{discoverNote}</p>}
                </section>
            )}

            {dashboard && (dashboard.notes || []).map((note) => <div key={note} className='bc-banner bc-banner-info'>{note}</div>)}

            {dashboard?.financial && (
                <FinancialSummary financial={dashboard.financial} comparedWith={dashboard.comparedWith} onOpen={() => onOpenReport(dashboard.financial.link.report, dashboard.financial.link.params)} onOpenReport={onOpenReport} />
            )}

            {dashboard && (
                <>
                    <StatCardGrid min={170}>
                        {dashboard.kpis.map((kpi) => {
                            const card = (
                                <StatCard
                                    label={kpi.label}
                                    value={<span title={formatValue(kpi.value, kpi.format)}>{formatKpi(kpi.value, kpi.format)}</span>}
                                    description={kpi.hint || describeChange(kpi.change, dashboard.comparedWith)}
                                />
                            )
                            // A tile opens the report that breaks its figure down,
                            // with the dashboard's period and filters carried over.
                            return kpi.link ? (
                                <button key={kpi.key} type='button' className='bc-tile' title={`See what makes up ${kpi.label.toLowerCase()}`} onClick={() => onOpenReport(kpi.link.report, kpi.link.params)}>
                                    {card}
                                </button>
                            ) : <div key={kpi.key}>{card}</div>
                        })}
                    </StatCardGrid>

                    <div className='bc-chart-grid'>
                        {dashboard.charts.map((chart) => (
                            <BCChart key={chart.key} chart={chart} onOpen={chart.link ? () => onOpenReport(chart.link.report, chart.link.params) : undefined} />
                        ))}
                    </div>

                    {/* Keyed by when the dashboard was built, so a reload starts it again on the dashboard's own year. */}
                    {dashboard.monthly && <MonthlyPerformance key={dashboard.generatedAt || 'monthly'} api={api} monthly={dashboard.monthly} branches={dashboard.params?.branches || []} />}

                    {(dashboard.pinned || []).length > 0 && (
                        <section className='bc-pinned'>
                            <h3>Your reports</h3>
                            {dashboard.pinned.map((pinned) => (
                                <div key={pinned.key} className='bc-card bc-pinned-report'>
                                    <header className='bc-chart-head'>
                                        <h4>{pinned.title}</h4>
                                        <button type='button' className='bc-link-button' onClick={() => onOpenReport(pinned.key, { from: dashboard.params.from, to: dashboard.params.to })}>Open report</button>
                                    </header>
                                    {pinned.note && <p className='bc-muted'>{pinned.note}</p>}
                                    {pinned.kpis.length > 0 && (
                                        <StatCardGrid min={170}>
                                            {pinned.kpis.map((kpi) => <StatCard key={kpi.key} label={kpi.label} value={<span title={formatValue(kpi.value, kpi.format)}>{formatKpi(kpi.value, kpi.format)}</span>} />)}
                                        </StatCardGrid>
                                    )}
                                    {pinned.charts.map((chart) => <BCChart key={chart.key} chart={chart} />)}
                                    {!pinned.kpis.length && !pinned.charts.length && !pinned.note && <p className='bc-muted'>This report has no tiles or chart. Add some in the report builder to see them here.</p>}
                                </div>
                            ))}
                        </section>
                    )}

                    <div className='bc-chart-grid'>
                        <section className='bc-card'>
                            <header className='bc-chart-head'>
                                <h3>At or below reorder point</h3>
                                <button type='button' className='bc-link-button' onClick={() => onOpenReport('reorder')}>Reorder suggestions</button>
                            </header>
                            {dashboard.lists.lowStock.length === 0 ? (
                                <p className='bc-empty'>No item is at or below its reorder point. Items without a reorder point on the item card are not checked.</p>
                            ) : (
                                <table className='bc-table'>
                                    <thead><tr><th>Item</th><th className='bc-num'>On hand</th><th className='bc-num'>Reorder point</th></tr></thead>
                                    <tbody>
                                        {dashboard.lists.lowStock.map((item) => (
                                            <tr key={item.itemNo}>
                                                <td>{item.description}<span className='bc-sub'>{item.itemNo}</span></td>
                                                <td className='bc-num'>{formatValue(item.onHand, 'qty')}</td>
                                                <td className='bc-num'>{formatValue(item.reorderPoint, 'qty')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </section>

                        <section className='bc-card'>
                            <header className='bc-chart-head'>
                                <h3>Stock with no sales or consumption in the period</h3>
                                <button type='button' className='bc-link-button' onClick={() => onOpenReport('velocity')}>Item velocity</button>
                            </header>
                            {dashboard.lists.idleStock.length === 0 ? (
                                <p className='bc-empty'>Every item in stock moved during this period.</p>
                            ) : (
                                <table className='bc-table'>
                                    <thead><tr><th>Item</th><th className='bc-num'>On hand</th><th className='bc-num'>Value</th><th>Last moved out</th></tr></thead>
                                    <tbody>
                                        {dashboard.lists.idleStock.map((item) => (
                                            <tr key={item.itemNo}>
                                                <td>{item.description}<span className='bc-sub'>{item.itemNo}</span></td>
                                                <td className='bc-num'>{formatValue(item.onHand, 'qty')}</td>
                                                <td className='bc-num'>{formatValue(item.value, 'money')}</td>
                                                <td>{item.lastOut || 'Never'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </section>
                    </div>
                </>
            )}
        </div>
    )
}

export default BCDashboard
