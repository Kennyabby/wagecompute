import { useCallback, useEffect, useState } from 'react'
import BCPreparing, { usePreparingRetry } from './BCPreparing'
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
    const { preparing, awaitData } = usePreparingRetry()
    const [discovering, setDiscovering] = useState(false)
    const [discoverNote, setDiscoverNote] = useState('')

    const load = useCallback(async (params) => {
        setLoading(true)
        setError('')
        try {
            const response = await awaitData(() => api.getDashboard(params))
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
