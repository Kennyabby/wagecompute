import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import ContextProvider from '../../Resources/ContextProvider'
import StatCard from '../Shared/ui/StatCard'
import StatCardGrid from '../Shared/ui/StatCardGrid'
import BCChart from './BCChart'
import BCDataTable, { isNumericColumn } from './BCDataTable'
import BCBuilder from './BCBuilder'
import BCDrillModal from './BCDrillModal'
import { companyInfoFrom, dateRangeFrom, exportTable } from './bcExport'
import BCFilterBar, { initialFilterValues } from './BCFilterBar'
import { formatKpi, formatValue } from './bcFormat'
import BCPreparing, { BCUpdating, usePreparingRetry } from './BCPreparing'

// Filter values written out for the export header, so a printed report says
// what it was filtered to.
const describeFilters = (definition, params, lookups) => {
    const described = {}
    definition.filters.forEach((filter) => {
        const value = params[filter.key]
        if (filter.type === 'multi' && value?.length) {
            const options = filter.options || lookups?.[filter.lookup] || []
            described[filter.label] = value.map((entry) => options.find((option) => option.value === entry)?.label || entry).join(', ')
        } else if (filter.type === 'select') {
            described[filter.label] = filter.options.find((option) => option.value === value)?.label || value
        } else if (filter.type === 'toggle' && value) {
            described[filter.label] = 'Yes'
        } else if ((filter.type === 'number' || filter.type === 'text') && value !== '' && value !== undefined) {
            described[filter.label] = value
        }
    })
    return described
}

// A short description of a row for the breakdown heading: its first few
// text columns, e.g. "FG-75CL, Bottled water 75cl, Sales depot".
const describeRow = (columns, row) => columns
    .filter((column) => !isNumericColumn(column) && column.type !== 'date' && row[column.key])
    .slice(0, 3)
    .map((column) => row[column.key])
    .join(', ')

const ReportViewer = ({ api, definition, lookups, lastSyncedAt, onBack, onLoaded, preset }) => {
    const context = useContext(ContextProvider)
    const { setAlert, setAlertState, setAlertTimeout } = context
    const [drill, setDrill] = useState(null)
    // `preset` carries filters over from wherever the report was opened,
    // such as the dashboard's period. Only values this report has a filter
    // for are taken.
    const [values, setValues] = useState(() => {
        const initial = initialFilterValues(definition.filters)
        Object.entries(preset || {}).forEach(([key, value]) => {
            if (key in initial && value !== undefined && value !== null) initial[key] = value
        })
        return initial
    })
    const [report, setReport] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [exporting, setExporting] = useState('')
    const { preparing, updating, awaitData } = usePreparingRetry()

    const run = useCallback(async (params) => {
        setLoading(true)
        setError('')
        try {
            // A kept answer is shown first. The fresh one replaces it without
            // closing a breakdown someone has open in the meantime.
            const response = await awaitData(() => api.runReport(definition.key, params), (fresh) => setReport(fresh.report))
            setDrill(null)
            setReport(response.report)
            if (onLoaded) onLoaded()
        } catch (failure) {
            setError(failure.message)
        } finally {
            setLoading(false)
        }
    }, [api, definition.key, awaitData, onLoaded])

    // Runs once with the default filters when the report opens, and again
    // when a sync brings in new data. Later runs are started with the button.
    useEffect(() => {
        run(values)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [run, lastSyncedAt])

    const exportReport = async (kind) => {
        if (!report) return
        setExporting(kind)
        try {
            await exportTable({
                kind,
                title: `${report.title} (Business Central)`,
                columns: report.columns,
                rows: report.rows,
                totals: report.totals,
                dateRange: dateRangeFrom(report.params),
                filters: describeFilters(definition, report.params, lookups),
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

    return (
        <div className='bc-page'>
            <div className='bc-report-head'>
                <div>
                    <button type='button' className='bc-link-button' onClick={onBack}>&larr; All reports</button>
                    <h2>{definition.title}</h2>
                    <p className='bc-muted'>{definition.description}</p>
                </div>
                <div className='bc-actions'>
                    <button type='button' className='bc-button' disabled={!report?.rows.length || !!exporting} onClick={() => exportReport('excel')}>{exporting === 'excel' ? 'Exporting...' : 'Export Excel'}</button>
                    <button type='button' className='bc-button' disabled={!report?.rows.length || !!exporting} onClick={() => exportReport('pdf')}>{exporting === 'pdf' ? 'Exporting...' : 'Export PDF'}</button>
                </div>
            </div>

            <BCFilterBar filters={definition.filters} values={values} onChange={setValues} lookups={lookups} onSubmit={() => run(values)} busy={loading} />

            {error && <div className='bc-banner bc-banner-error'>{error}</div>}
            <BCPreparing progress={preparing} />
            <BCUpdating since={updating} />
            {!report && loading && !preparing && <p className='bc-empty'>Running the report...</p>}

            {report && (
                <div className={`bc-page ${loading ? 'bc-stale' : ''}`}>
                    {report.kpis.length > 0 && (
                        <StatCardGrid min={170}>
                            {report.kpis.map((kpi) => (
                                <StatCard
                                    key={kpi.key}
                                    label={kpi.label}
                                    value={<span title={formatValue(kpi.value, kpi.format)}>{formatKpi(kpi.value, kpi.format)}</span>}
                                    description={kpi.hint}
                                />
                            ))}
                        </StatCardGrid>
                    )}
                    {report.charts.length > 0 && (
                        <div className='bc-chart-grid'>
                            {report.charts.map((chart) => <BCChart key={chart.key} chart={chart} />)}
                        </div>
                    )}
                    {report.meta?.note && <div className='bc-banner bc-banner-info'>{report.meta.note}</div>}
                    <section className='bc-card'>
                        {report.columns.some((column) => column.drill) && report.rows.length > 0 && (
                            <p className='bc-muted'>Click any underlined figure to see the entries that make it up.</p>
                        )}
                        <BCDataTable
                            columns={report.columns}
                            rows={report.rows}
                            totals={report.totals}
                            onDrill={(row, column) => setDrill({ row, column, caption: describeRow(report.columns, row) })}
                        />
                    </section>
                </div>
            )}
            {drill && report && (
                <BCDrillModal
                    api={api}
                    report={report}
                    target={drill}
                    filters={describeFilters(definition, report.params, lookups)}
                    onClose={() => setDrill(null)}
                />
            )}
        </div>
    )
}

const BCReports = ({ api, lookups, lastSyncedAt, openKey, openPreset, onOpenKey, onGoTo, onLoaded, notify = () => {} }) => {
    const [catalogue, setCatalogue] = useState(null)
    const [error, setError] = useState('')
    const [search, setSearch] = useState('')
    // The builder: null when closed, { saved } while a report is being made
    // or edited. `version` makes the list load again after a save or delete.
    const [building, setBuilding] = useState(null)
    const [version, setVersion] = useState(0)

    useEffect(() => {
        let active = true
        api.getReports()
            .then((response) => { if (active) setCatalogue(response) })
            .catch((failure) => { if (active) setError(failure.message) })
        return () => { active = false }
    }, [api, lastSyncedAt, version])

    const edit = async (report) => {
        try {
            const saved = (await api.getSavedReports()).reports.find((entry) => entry.id === report.custom.id)
            if (saved) setBuilding({ saved })
            else { notify('error', 'That report no longer exists.'); setVersion((current) => current + 1) }
        } catch (failure) {
            notify('error', failure.message)
        }
    }
    const remove = async (report) => {
        if (!window.confirm(`Delete the report "${report.title}"? This cannot be undone.`)) return
        try {
            await api.deleteReport(report.custom.id)
            notify('success', `"${report.title}" deleted.`)
            setVersion((current) => current + 1)
        } catch (failure) {
            notify('error', failure.message)
        }
    }

    const selected = useMemo(() => catalogue?.reports.find((report) => report.key === openKey && report.available), [catalogue, openKey])

    if (building) {
        return (
            <BCBuilder
                api={api}
                saved={building.saved || null}
                notify={notify}
                onClose={() => setBuilding(null)}
                onSaved={(report) => { setBuilding(null); setVersion((current) => current + 1); onOpenKey(`custom:${report.id}`) }}
            />
        )
    }

    if (selected) {
        return <ReportViewer key={`${selected.key}:${openPreset?.stamp || ''}`} api={api} definition={selected} lookups={lookups} lastSyncedAt={lastSyncedAt} onBack={() => onOpenKey(null)} onLoaded={onLoaded} preset={openPreset?.values} />
    }

    const needle = search.trim().toLowerCase()
    const matches = (report) => !needle || report.title.toLowerCase().includes(needle) || report.description.toLowerCase().includes(needle)

    return (
        <div className='bc-page'>
            {error && <div className='bc-banner bc-banner-error'>{error}</div>}
            {!catalogue && !error && <p className='bc-empty'>Loading reports...</p>}
            {catalogue && (
                <>
                    <div className='bc-report-head'>
                        <input className='bc-input bc-search' placeholder='Search reports' value={search} onChange={(event) => setSearch(event.target.value)} aria-label='Search reports' />
                        <div className='bc-actions'>
                            <button type='button' className='bc-button bc-button-primary' onClick={() => setBuilding({})}>Build a report</button>
                        </div>
                    </div>
                    {catalogue.domains.map((domain) => {
                        const reports = catalogue.reports.filter((report) => report.domain === domain.key && matches(report))
                        if (!reports.length) return null
                        return (
                            <section key={domain.key} className='bc-domain'>
                                <h2>{domain.label}</h2>
                                <div className='bc-report-grid'>
                                    {reports.map((report) => {
                                        const card = (
                                            <button
                                                key={report.key}
                                                type='button'
                                                className='bc-card bc-report-card'
                                                disabled={!report.available}
                                                onClick={() => onOpenKey(report.key)}
                                            >
                                                <strong>{report.title}</strong>
                                                <span>{report.description}</span>
                                                {report.custom?.pinned && <span className='bc-report-reason'>Shown on the dashboard</span>}
                                                {!report.available && <span className='bc-report-reason'>Not available yet: {report.reason}</span>}
                                            </button>
                                        )
                                        // A report someone built can also be changed or deleted.
                                        return report.custom ? (
                                            <div key={report.key} className='bc-report-own'>
                                                {card}
                                                <span className='bc-report-own-actions'>
                                                    <button type='button' className='bc-link-button' onClick={() => edit(report)}>Edit</button>
                                                    <button type='button' className='bc-link-button' onClick={() => remove(report)}>Delete</button>
                                                    {report.custom.createdBy && <span className='bc-muted'>By {report.custom.createdBy}</span>}
                                                </span>
                                            </div>
                                        ) : card
                                    })}
                                </div>
                            </section>
                        )
                    })}
                    {catalogue.reports.some((report) => !report.available) && (
                        <p className='bc-muted'>
                            Reports that are not available yet need a page that is not published, mapped or synced.
                            {' '}<button type='button' className='bc-link-button' onClick={() => onGoTo('data')}>Open Data</button>
                        </p>
                    )}
                </>
            )}
        </div>
    )
}

export default BCReports
