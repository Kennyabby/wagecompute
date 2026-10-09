import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import ContextProvider from '../../Resources/ContextProvider'
import StatCard from '../Shared/ui/StatCard'
import StatCardGrid from '../Shared/ui/StatCardGrid'
import { generatePDF, generateExcel } from '../../utils/exportUtils'
import BCChart from './BCChart'
import BCDataTable, { isNumericColumn } from './BCDataTable'
import BCFilterBar, { initialFilterValues } from './BCFilterBar'
import { formatKpi, formatValue } from './bcFormat'
import BCPreparing, { usePreparingRetry } from './BCPreparing'

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

const ReportViewer = ({ api, definition, lookups, lastSyncedAt, onBack }) => {
    const { companyRecord, company, centralCompany, settings, setAlert, setAlertState, setAlertTimeout } = useContext(ContextProvider)
    const [values, setValues] = useState(() => initialFilterValues(definition.filters))
    const [report, setReport] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [exporting, setExporting] = useState('')
    const { preparing, awaitData } = usePreparingRetry()

    const run = useCallback(async (params) => {
        setLoading(true)
        setError('')
        try {
            const response = await awaitData(() => api.runReport(definition.key, params))
            if (response) setReport(response.report)
        } catch (failure) {
            setError(failure.message)
        } finally {
            setLoading(false)
        }
    }, [api, definition.key, awaitData])

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
            const companyData = companyRecord || company || {}
            const companyInfo = {
                name: centralCompany?.name || companyData.name || settings?.companyName || '',
                address: centralCompany?.address || companyData.address || '',
                phone: companyData.phone || '',
                email: centralCompany?.email || companyData.email || '',
                logoUrl: centralCompany?.logoUrl || companyData.logoUrl || null,
            }
            const columns = report.columns.map((column) => ({ name: column.label, reference: column.key, numeric: isNumericColumn(column) }))
            const dateRange = report.params.from
                ? { startDate: report.params.from, endDate: report.params.to }
                : (report.params.asOf ? `As of ${report.params.asOf}` : null)
            const filters = describeFilters(definition, report.params, lookups)
            const title = `${report.title} (Business Central)`
            if (kind === 'pdf') await generatePDF(report.rows, columns, companyInfo, dateRange, title, filters)
            else generateExcel(report.rows, columns, companyInfo, dateRange, title, filters)
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
                        <BCDataTable columns={report.columns} rows={report.rows} totals={report.totals} />
                    </section>
                </div>
            )}
        </div>
    )
}

const BCReports = ({ api, lookups, lastSyncedAt, openKey, onOpenKey, onGoTo }) => {
    const [catalogue, setCatalogue] = useState(null)
    const [error, setError] = useState('')
    const [search, setSearch] = useState('')

    useEffect(() => {
        let active = true
        api.getReports()
            .then((response) => { if (active) setCatalogue(response) })
            .catch((failure) => { if (active) setError(failure.message) })
        return () => { active = false }
    }, [api, lastSyncedAt])

    const selected = useMemo(() => catalogue?.reports.find((report) => report.key === openKey && report.available), [catalogue, openKey])

    if (selected) {
        return <ReportViewer key={selected.key} api={api} definition={selected} lookups={lookups} lastSyncedAt={lastSyncedAt} onBack={() => onOpenKey(null)} />
    }

    const needle = search.trim().toLowerCase()
    const matches = (report) => !needle || report.title.toLowerCase().includes(needle) || report.description.toLowerCase().includes(needle)

    return (
        <div className='bc-page'>
            {error && <div className='bc-banner bc-banner-error'>{error}</div>}
            {!catalogue && !error && <p className='bc-empty'>Loading reports...</p>}
            {catalogue && (
                <>
                    <input className='bc-input bc-search' placeholder='Search reports' value={search} onChange={(event) => setSearch(event.target.value)} aria-label='Search reports' />
                    {catalogue.domains.map((domain) => {
                        const reports = catalogue.reports.filter((report) => report.domain === domain.key && matches(report))
                        if (!reports.length) return null
                        return (
                            <section key={domain.key} className='bc-domain'>
                                <h2>{domain.label}</h2>
                                <div className='bc-report-grid'>
                                    {reports.map((report) => (
                                        <button
                                            key={report.key}
                                            type='button'
                                            className='bc-card bc-report-card'
                                            disabled={!report.available}
                                            onClick={() => onOpenKey(report.key)}
                                        >
                                            <strong>{report.title}</strong>
                                            <span>{report.description}</span>
                                            {!report.available && <span className='bc-report-reason'>Not available yet: {report.reason}</span>}
                                        </button>
                                    ))}
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
