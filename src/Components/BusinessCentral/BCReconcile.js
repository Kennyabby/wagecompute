import { useCallback, useEffect, useMemo, useState } from 'react'
import StatCard from '../Shared/ui/StatCard'
import StatCardGrid from '../Shared/ui/StatCardGrid'
import BCDataTable from './BCDataTable'
import BCPreparing, { BCUpdating, usePreparingRetry } from './BCPreparing'
import { downloadReconExcel, downloadReconPdf, verdictOf } from './bcReconExport'
import { formatValue } from './bcFormat'
import BCReconcileMapper from './BCReconcileMapper'
import { useBCAccess } from './bcAccess'
import { applySavedMapping, checkMapping, looksLikeTemplate, toSavedPart, toTemplateSheet } from './bcReconMap'

// Reconciling a report against the person's own records. The server makes
// the template for the report's period and does the comparing; this page
// writes the template to a file, reads the filled-in file back into plain
// rows of cells, and shows what the comparison found and how to settle it.

const loadSpreadsheets = () => import('xlsx')

// Only these sheets go back to the server. The BC sheets in the template
// are for reading and can be large.
export const INPUT_SHEETS = ['About', 'Your figures', 'Your transactions']

const pad = (value) => String(value).padStart(2, '0')

/**
 * A sheet's rows as the server reads them. Dates come out of the
 * spreadsheet library as Date objects at local midnight, so they are
 * written back as the day the sheet shows, not converted through UTC.
 */
export const cellsForServer = (rows) => rows.map((row) => (Array.isArray(row) ? row.map((cell) => (
    cell instanceof Date && !Number.isNaN(cell.getTime()) ? `${cell.getFullYear()}-${pad(cell.getMonth() + 1)}-${pad(cell.getDate())}` : cell
)) : []))

// How each kind of fix is shown, in the order they are worked through.
export const ACTIONS = [
    { key: 'fixSheet', label: 'Correct your sheet', tone: 'muted' },
    { key: 'post', label: 'Post in Business Central', tone: 'info' },
    { key: 'move', label: 'Move it in Business Central', tone: 'info' },
    { key: 'decide', label: 'Decide which side is right', tone: 'warn' },
    { key: 'reverse', label: 'Reverse in Business Central', tone: 'warn' },
    { key: 'check', label: 'Check first', tone: 'warn' },
    { key: 'timing', label: 'Timing only', tone: 'muted' },
    { key: 'adjust', label: 'Adjust (last resort)', tone: 'error' },
]
const ACTION_BY_KEY = new Map(ACTIONS.map((action) => [action.key, action]))

const TYPE_LABELS = {
    missingInErp: 'On your sheet, not in Business Central',
    missingInSheet: 'In Business Central, not on your sheet',
    amountDiffers: 'Same document, different figure',
    otherPeriod: 'Dated in another period',
    placeDiffers: 'Posted to another location',
    subjectDiffers: 'Posted against something else',
    opening: 'Opening balance differs',
    sheetArithmetic: 'Your sheet does not add up',
    figureDiffers: 'Figure differs',
    unexplained: 'Not explained by any transaction',
    notInBc: 'Not in Business Central',
    valueDiffers: 'Value differs',
    unlisted: 'Business Central entries not on your list',
}

const STATUS_TONE = { Agrees: 'ok', Difference: 'error', 'Not on your sheet': 'muted', 'Not in Business Central': 'warn', 'Outside the filters': 'muted' }

// The period reconciled: the report's own, or for a report that works to
// a date, the month up to that date, as the server takes it.
export const periodOf = (params = {}) => (params.from ? { from: params.from, to: params.to } : { from: params.asOf ? `${params.asOf.slice(0, 8)}01` : '', to: params.asOf || '' })

/** The figure a line is judged by: its closing balance, or its amount. */
export const headlineFigure = (result) => {
    const figures = result?.figureColumns || []
    return figures.find((figure) => /^closing/i.test(figure.key) && figure.measure === result.measure)
        || figures.find((figure) => figure.key === 'amount')
        || figures[figures.length - 1]
}

const signed = (value, measure) => {
    if (value === null || value === undefined) return ''
    const shown = formatValue(Math.abs(value), measure === 'money' ? 'money' : 'qty')
    return value > 0 ? `+${shown}` : value < 0 ? `-${shown}` : shown
}
const leaning = (value) => (value > 0 ? 'Your sheet is higher' : value < 0 ? 'Business Central is higher' : '')

/** Every finding as one flat row, for the export. */
export const findingRows = (result) => {
    const lines = new Map((result.lines || []).map((line) => [line.key, line]))
    const lineText = (key) => {
        const line = lines.get(key)
        return line ? (result.lineColumns || []).map((column) => line.cells?.[column.key]).filter(Boolean).join(' ') : key
    }
    return (result.findings || []).map((finding) => {
        const best = finding.resolution?.options?.[0]
        return {
            line: lineText(finding.lineKey),
            found: TYPE_LABELS[finding.type] || finding.type,
            detail: finding.detail || '',
            date: finding.date || '',
            documentNo: finding.documentNo || '',
            effect: finding.effect ?? '',
            direction: leaning(finding.effect),
            action: ACTION_BY_KEY.get(finding.resolution?.action)?.label || '',
            todo: finding.resolution?.headline || '',
            page: best?.page?.label || '',
            steps: (best?.steps || []).join(' '),
            accounts: (best?.accounts || []).map((account) => `${account.role} ${account.no} ${account.name}`.trim()).join('; '),
            otherWays: (finding.resolution?.options || []).slice(1).map((entry) => `${entry.title}${entry.page ? ` (${entry.page.label})` : ''}`).join('; '),
            lastResort: finding.resolution?.lastResort || (finding.resolution?.options || []).some((entry) => entry.lastResort) ? 'Yes' : '',
        }
    })
}

/** The transactions, paired or not, flattened for a table. */
export const transactionRows = (result) => (result.transactions || []).map((row) => {
    const side = row.sheet || row.erp || {}
    const amountOf = (entry) => (entry ? entry.quantity ?? entry.amount ?? '' : '')
    const sheetAmount = amountOf(row.sheet)
    const erpAmount = amountOf(row.erp)
    return {
        status: row.status,
        matchedBy: row.rule || '',
        sheetDate: row.sheet?.date || '',
        erpDate: row.erp?.date || '',
        documentNo: row.erp?.documentNo || row.sheet?.documentNo || '',
        type: row.erp?.type || row.sheet?.type || '',
        subject: side.itemNo || side.partnerNo || side.accountNo || '',
        location: [row.sheet?.locationCode, row.erp?.locationCode].filter(Boolean).filter((value, index, all) => all.indexOf(value) === index).join(' / '),
        sheetAmount,
        erpAmount,
        difference: sheetAmount === '' && erpAmount === '' ? '' : Math.round(((Number(sheetAmount) || 0) - (Number(erpAmount) || 0)) * 10000) / 10000,
        sheetRow: (row.sheet?.sheetRows || []).join(', '),
        entryNos: (row.erp?.entryNos || []).join(', '),
        finding: row.findingId || '',
    }
})

const TRANSACTION_COLUMNS = [
    { key: 'status', label: 'Status', type: 'text' },
    { key: 'matchedBy', label: 'Matched by', type: 'text' },
    { key: 'sheetDate', label: 'Date on your sheet', type: 'date' },
    { key: 'erpDate', label: 'Date in BC', type: 'date' },
    { key: 'documentNo', label: 'Document No.', type: 'text' },
    { key: 'type', label: 'Type', type: 'text' },
    { key: 'subject', label: 'Item, partner or account', type: 'text' },
    { key: 'location', label: 'Location', type: 'text' },
    { key: 'sheetAmount', label: 'Yours', type: 'number' },
    { key: 'erpAmount', label: 'Business Central', type: 'number' },
    { key: 'difference', label: 'Difference', type: 'number' },
    { key: 'sheetRow', label: 'Your row', type: 'text' },
    { key: 'entryNos', label: 'BC entry No.', type: 'text' },
]

const Option = ({ entry, index }) => (
    <li className={`bc-recon-option${entry.lastResort ? ' bc-recon-last' : ''}`}>
        <div className='bc-recon-option-head'>
            <strong>{index + 1}. {entry.title}</strong>
            {entry.page && <span className='bc-chip'>{entry.page.label}</span>}
            {entry.lastResort && <span className='bc-status bc-status-error'>Last resort</span>}
        </div>
        {entry.steps.length > 0 && <ol className='bc-recon-steps'>{entry.steps.map((step) => <li key={step}>{step}</li>)}</ol>}
        {entry.accounts.length > 0 && (
            <p className='bc-muted'>Accounts: {entry.accounts.map((account) => `${account.role} ${account.no}${account.name ? ` ${account.name}` : ''}`).join('; ')}</p>
        )}
    </li>
)

const EntryList = ({ title, rows, measure }) => (rows?.length ? (
    <details className='bc-recon-entries'>
        <summary>{title} ({rows.length.toLocaleString()})</summary>
        <div className='bc-table-scroll'>
            <table className='bc-table'>
                <thead><tr><th>Date</th><th>Document No.</th><th>Type</th><th>Effect</th><th>BC entry No.</th></tr></thead>
                <tbody>
                    {rows.map((row, index) => (
                        <tr key={`${row.documentNo}-${index}`}>
                            <td>{row.date}</td>
                            <td>{row.documentNo}</td>
                            <td>{row.type}</td>
                            <td className={row.effect >= 0 ? 'bc-recon-plus' : 'bc-recon-minus'}>{signed(row.effect, measure)} {row.effect >= 0 ? '(in)' : '(out)'}</td>
                            <td>{(row.entryNos || []).join(', ')}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </details>
) : null)

// The uploaded file is kept with the run unless it is unusually large.
const ORIGINAL_LIMIT = 20 * 1024 * 1024

const READ_AS = { template: 'The template, filled in', savedMapping: 'A saved column mapping', mapped: 'Columns mapped by hand' }

const runOutcome = (summary) => {
    if (!summary) return ''
    if (summary.outcome === 'problems') return `${summary.problemCount} ${summary.problemCount === 1 ? 'cell' : 'cells'} to fix, not compared`
    if (summary.outcome === 'agrees') return 'Everything agrees'
    return `${summary.differ} ${summary.differ === 1 ? 'line differs' : 'lines differ'}, ${summary.findings} to act on${summary.lastResort ? `, ${summary.lastResort} last resort` : ''}`
}

/** Writes sheets of cells, as kept with a run, to a workbook file. */
const downloadSheets = async (sheets, fileName) => {
    const XLSX = await loadSpreadsheets()
    const workbook = XLSX.utils.book_new()
    Object.entries(sheets).forEach(([name, rows]) => XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(Array.isArray(rows) ? rows : []), String(name).slice(0, 31)))
    XLSX.writeFile(workbook, fileName)
}

/** What a run read from the file, sheet by sheet, with both files to download. */
export const ImportedData = ({ input, original, file, onError }) => {
    const names = Object.keys(input || {}).filter((name) => Array.isArray(input[name]) && input[name].length)
    const [shown, setShown] = useState(names.find((name) => name !== 'About') || names[0] || '')
    const rows = input?.[shown] || []
    const header = rows[0] || []
    const width = rows.reduce((most, row) => Math.max(most, Array.isArray(row) ? row.length : 0), 0)
    const columns = Array.from({ length: width }, (_, index) => ({ key: `c${index}`, label: String(header[index] ?? '').trim() || `Column ${index + 1}`, type: 'text' }))
    const tableRows = rows.slice(1).map((row) => Object.fromEntries(columns.map((column, index) => [column.key, Array.isArray(row) ? row[index] ?? '' : ''])))
    const base = String(file?.name || 'reconciliation').replace(/\.[^.]+$/, '')
    const save = (sheets, suffix) => downloadSheets(sheets, `${base}${suffix}.xlsx`).catch((failure) => onError(failure.message))
    return (
        <div className='bc-recon-imported'>
            <div className='bc-actions'>
                {original && <button type='button' className='bc-button' onClick={() => save(original, '')}>Download the file as uploaded</button>}
                {names.length > 0 && <button type='button' className='bc-button' onClick={() => save(input, ' (as read)')}>Download what was read</button>}
            </div>
            {!original && file?.originalLeftOut && <p className='bc-muted'>{file.originalLeftOut}</p>}
            {names.length > 1 && (
                <nav className='bc-tabs bc-tabs-inner' aria-label='Sheets read'>
                    {names.map((name) => <button key={name} type='button' className={shown === name ? 'active' : ''} aria-current={shown === name ? 'page' : undefined} onClick={() => setShown(name)}>{name}</button>)}
                </nav>
            )}
            {shown ? <BCDataTable key={shown} columns={columns} rows={tableRows} totals={{}} filterable /> : <p className='bc-empty'>Nothing was read from the file.</p>}
        </div>
    )
}

const Finding = ({ finding, measure }) => {
    const action = ACTION_BY_KEY.get(finding.resolution?.action) || ACTIONS[0]
    const pair = [finding.sheetTransaction, finding.erpTransaction]
    return (
        <article className={`bc-recon-finding bc-recon-${action.tone}`}>
            <header>
                <span className={`bc-status bc-status-${action.tone}`}>{action.label}</span>
                <strong>{TYPE_LABELS[finding.type] || finding.type}</strong>
                {finding.effect ? <span className='bc-muted'>{signed(finding.effect, finding.measure || measure)} ({leaning(finding.effect).toLowerCase()})</span> : null}
            </header>
            <p>{finding.detail}</p>
            {pair.some(Boolean) && (
                <div className='bc-table-scroll'>
                    <table className='bc-table bc-recon-pair'>
                        <thead><tr><th /><th>Date</th><th>Document No.</th><th>Type</th><th>Figure</th></tr></thead>
                        <tbody>
                            {finding.sheetTransaction && <tr><th>Your sheet{finding.sheetTransaction.sheetRows?.length ? `, row ${finding.sheetTransaction.sheetRows.join(', ')}` : ''}</th><td>{finding.sheetTransaction.date}</td><td>{finding.sheetTransaction.documentNo}</td><td>{finding.sheetTransaction.type}</td><td>{signed(finding.sheetTransaction.quantity ?? finding.sheetTransaction.amount, finding.measure || measure)}</td></tr>}
                            {finding.erpTransaction && <tr><th>Business Central{finding.erpTransaction.entryNos?.length ? `, entry ${finding.erpTransaction.entryNos.join(', ')}` : ''}</th><td>{finding.erpTransaction.date}</td><td>{finding.erpTransaction.documentNo}</td><td>{finding.erpTransaction.type}</td><td>{signed(finding.erpTransaction.quantity ?? finding.erpTransaction.amount, finding.measure || measure)}</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}
            {finding.openDocuments?.length > 0 && (
                <p className='bc-muted'>Open in Business Central: {finding.openDocuments.map((doc) => `${doc.page?.name || ''} ${doc.documentNo} (${formatValue(doc.quantity ?? doc.amount, doc.quantity !== undefined ? 'qty' : 'money')}${doc.explainsAll ? ', explains all of it' : ''})`).join('; ')}</p>
            )}
            <EntryList title='Business Central entries behind this figure, in and out' rows={finding.candidates} measure={finding.measure || measure} />
            <p className='bc-recon-headline'>{finding.resolution?.headline}</p>
            {finding.resolution?.options?.length > 0 && <ol className='bc-recon-options'>{finding.resolution.options.map((entry, index) => <Option key={`${entry.title}-${index}`} entry={entry} index={index} />)}</ol>}
        </article>
    )
}

const BCReconcile = ({ api, definition, report, companyInfo }) => {
    const reconcile = definition.reconcile
    const [busy, setBusy] = useState('')
    const [error, setError] = useState('')
    const [fileName, setFileName] = useState('')
    const [comparedAt, setComparedAt] = useState(null)
    const [result, setResult] = useState(null)
    const [tab, setTab] = useState('lines')
    const [actionFilter, setActionFilter] = useState('')
    const [onlyDifferences, setOnlyDifferences] = useState(true)
    const [openLine, setOpenLine] = useState('')
    // A file of the person's own: its sheets, the columns to map them to,
    // and the mapping being worked on or remembered.
    const [mapper, setMapper] = useState(null)
    const [usedMapping, setUsedMapping] = useState(null)
    const [mappingNote, setMappingNote] = useState('')
    const { preparing, updating, awaitData } = usePreparingRetry()
    // What the result on screen was made from, and, when it is a past run
    // opened from the list, that run.
    const [imported, setImported] = useState(null)
    const [viewing, setViewing] = useState(null)
    const [history, setHistory] = useState(null)
    // Whether the list is everyone's runs (an admin) or the user's own.
    const [everyone, setEveryone] = useState(false)
    // The id the run on screen was saved under, to delete it.
    const [savedRunId, setSavedRunId] = useState('')
    // Past runs, and deleting runs, are each given on the Access tab.
    const { can } = useBCAccess()
    const seesHistory = can('recon.history')
    const mayDelete = can('recon.deleteRuns')
    const period = periodOf(report.params)

    // The runs for the period the report is filtered to.
    const loadHistory = useCallback(() => {
        if (!seesHistory || !api.reconcileHistory) return
        api.reconcileHistory(definition.key, { from: period.from, to: period.to })
            .then((response) => { setHistory(response.runs || []); setEveryone(!!response.everyone) })
            .catch(() => setHistory([]))
    }, [api, definition.key, seesHistory, period.from, period.to])
    useEffect(() => { loadHistory() }, [loadHistory])

    const downloadTemplate = async () => {
        setBusy('template')
        setError('')
        try {
            const response = await awaitData(() => api.reconcileTemplate(reconcile.kind, report.params, definition.key))
            const template = response.template
            const XLSX = await loadSpreadsheets()
            const workbook = XLSX.utils.book_new()
            template.sheets.forEach((sheet) => {
                const made = XLSX.utils.aoa_to_sheet(sheet.rows)
                made['!cols'] = (sheet.widths || []).map((width) => ({ wch: width }))
                XLSX.utils.book_append_sheet(workbook, made, sheet.name)
            })
            XLSX.writeFile(workbook, template.fileName)
        } catch (failure) {
            setError(failure.message || 'The template could not be made.')
        } finally {
            setBusy('')
        }
    }

    // Sends sheets laid out like the template and shows the answer. The run
    // is kept with the file's name, how it was read and, unless it is very
    // large, every sheet of the file as uploaded.
    const compareSheets = async (sheets, name, how = {}) => {
        const original = how.original ? Object.fromEntries(Object.entries(how.original).map(([sheetName, rows]) => [sheetName, cellsForServer(rows || [])])) : null
        const tooLarge = !!original && JSON.stringify(original).length > ORIGINAL_LIMIT
        const file = {
            name,
            size: how.size ?? null,
            read: how.read || 'template',
            mappingName: how.mappingName || '',
            ...(tooLarge ? { originalLeftOut: 'The uploaded file was too large to keep in full. What was read from it is kept.' } : {}),
        }
        const kept = { file, original: tooLarge ? null : original }
        const response = await awaitData(() => api.reconcileRun(reconcile.kind, report.params, sheets, definition.key, kept), (fresh) => setResult(fresh.result))
        setViewing(null)
        setSavedRunId(response.savedRun || '')
        setImported({ input: sheets, original: kept.original, file })
        setFileName(name)
        setComparedAt(new Date())
        setResult(response.result)
        setTab('lines')
        setActionFilter('')
        setOpenLine('')
        if (response.savedRun) loadHistory()
        return response.result
    }

    // A past run, opened from the list: shown as it was, with what was imported.
    const openRun = async (id) => {
        setBusy('history')
        setError('')
        try {
            const { run } = await api.reconcileHistoryItem(id)
            setMapper(null)
            setUsedMapping(null)
            setMappingNote('')
            setViewing(run)
            setSavedRunId(run.id)
            setImported({ input: run.input || {}, original: run.original, file: run.file })
            setFileName(run.file?.name || '')
            setComparedAt(new Date(run.createdAt))
            setResult(run.result)
            setTab(run.result?.problems ? 'imported' : 'lines')
            setActionFilter('')
            setOpenLine('')
        } catch (failure) {
            setError(failure.message)
        } finally {
            setBusy('')
        }
    }

    // A past run from the list, or the one on screen.
    const removeRun = async (run) => {
        if (!window.confirm(`Delete the reconciliation of ${run.file?.name || 'this file'}${run.createdAt ? ` from ${new Date(run.createdAt).toLocaleString()}` : ''}? Its file and result go for good.`)) return
        try {
            await api.deleteReconcileRun(run.id)
            if (savedRunId === run.id) closeRun()
            loadHistory()
        } catch (failure) {
            setError(failure.message)
        }
    }

    const closeRun = () => { setViewing(null); setResult(null); setImported(null); setFileName(''); setSavedRunId('') }

    // A mapping that passed and was compared is remembered for the report,
    // so the next file with the same headings goes straight through.
    const remember = async (parts, name) => {
        try {
            const kept = Object.fromEntries(Object.entries(parts).map(([part, entry]) => [part, toSavedPart(entry)]))
            await api.saveReconcileMapping({ kind: reconcile.kind, reportKey: definition.key, parts: kept, name })
            setMappingNote('The mapping is saved. Files with these headings will be read the same way next time, with no mapping.')
        } catch (failure) {
            setMappingNote(`The comparison is done, but the mapping could not be saved: ${failure.message}`)
        }
    }

    const importFile = async (event) => {
        const chosen = event.target.files?.[0]
        event.target.value = ''
        if (!chosen) return
        setBusy('import')
        setError('')
        setResult(null)
        setViewing(null)
        setImported(null)
        setMapper(null)
        setUsedMapping(null)
        setMappingNote('')
        try {
            const XLSX = await loadSpreadsheets()
            const workbook = XLSX.read(await chosen.arrayBuffer(), { type: 'array', cellDates: true })
            const raw = Object.fromEntries(workbook.SheetNames.map((name) => [name, XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, raw: true, defval: '' })]))
            const templateSheets = {}
            INPUT_SHEETS.forEach((name) => {
                const found = workbook.SheetNames.find((sheetName) => sheetName.trim().toLowerCase() === name.toLowerCase())
                if (found) templateSheets[name] = cellsForServer(raw[found])
            })
            const [columnsAnswer, mappingsAnswer] = await Promise.all([
                api.reconcileColumns(reconcile.kind, report.params, definition.key),
                api.reconcileMappings(reconcile.kind, definition.key).catch(() => ({ mappings: [] })),
            ])
            const columns = columnsAnswer.columns
            // 1. The template, filled in: it goes as it is.
            if (looksLikeTemplate(templateSheets, columns)) {
                await compareSheets(templateSheets, chosen.name, { read: 'template', size: chosen.size, original: raw })
                return
            }
            // 2. A layout mapped before: used again, if every cell still passes.
            for (const saved of mappingsAnswer.mappings || []) {
                const plan = applySavedMapping(saved, raw)
                if (!plan) continue
                const passes = Object.entries(plan).every(([part, entry]) => !checkMapping({ rows: entry.rows, headerAt: entry.headerAt, mapping: entry.mapping, columns: columns[part] || [] }).errors.length)
                const sheets = Object.fromEntries(Object.entries(plan).map(([part, entry]) => [part === 'figures' ? 'Your figures' : 'Your transactions', toTemplateSheet({ rows: entry.rows, headerAt: entry.headerAt, mapping: entry.mapping, columns: columns[part] || [] })]))
                if (!passes) {
                    setMapper({ fileName: chosen.name, size: chosen.size, sheets: raw, columns, initial: plan })
                    setMappingNote('This file has the headings of a saved mapping, but some of its cells do not pass the checks. They are listed below.')
                    return
                }
                setUsedMapping({ id: saved.id, savedAt: saved.usedAt, name: saved.name, plan, columns, sheets: raw, fileName: chosen.name })
                const answer = await compareSheets(sheets, chosen.name, { read: 'savedMapping', mappingName: saved.name, size: chosen.size, original: raw })
                if (!answer?.problems) remember(Object.fromEntries(Object.entries(plan).map(([part, entry]) => [part, entry])), chosen.name)
                return
            }
            // 3. Anything else: the person matches the columns.
            setMapper({ fileName: chosen.name, size: chosen.size, sheets: raw, columns, initial: null })
        } catch (failure) {
            setError(failure.message || 'The file could not be read.')
        } finally {
            setBusy('')
        }
    }

    const compareMapped = async ({ sheets, parts }) => {
        setBusy('import')
        setError('')
        setMappingNote('')
        try {
            const answer = await compareSheets(sheets, mapper.fileName, { read: 'mapped', size: mapper.size, original: mapper.sheets })
            // Only a mapping whose file passed the server's checks too is kept.
            if (!answer?.problems) {
                await remember(parts, mapper.fileName)
                setMapper(null)
            }
        } catch (failure) {
            setError(failure.message || 'The file could not be compared.')
        } finally {
            setBusy('')
        }
    }

    const forgetMapping = async () => {
        if (!usedMapping) return
        try {
            await api.deleteReconcileMapping(usedMapping.id)
            setMappingNote('The saved mapping is forgotten. The next file with these headings will ask for its columns again.')
            setUsedMapping(null)
        } catch (failure) { setError(failure.message) }
    }

    const findingsById = useMemo(() => new Map((result?.findings || []).map((finding) => [finding.id, finding])), [result])
    const headline = headlineFigure(result)
    const lines = useMemo(() => (result?.lines || []).filter((line) => (!onlyDifferences || line.status !== 'Agrees')
        && (!actionFilter || line.findings.some((id) => findingsById.get(id)?.resolution?.action === actionFilter))), [result, onlyDifferences, actionFilter, findingsById])
    const findings = useMemo(() => (result?.findings || []).filter((finding) => !actionFilter || finding.resolution?.action === actionFilter)
        .sort((a, b) => ACTIONS.findIndex((action) => action.key === a.resolution?.action) - ACTIONS.findIndex((action) => action.key === b.resolution?.action)), [result, actionFilter])
    const transactions = useMemo(() => (result ? transactionRows(result) : []), [result])

    // The whole reconciliation, kept for review before anything is posted,
    // whether it found differences or not.
    const exportAll = async (kind) => {
        setBusy(kind)
        try {
            const meta = { fileName, company: companyInfo?.name || '', comparedAt: comparedAt || new Date() }
            if (kind === 'excel') await downloadReconExcel(result, meta)
            else await downloadReconPdf(result, meta)
        } catch (failure) {
            setError(failure.message)
        } finally {
            setBusy('')
        }
    }

    const summary = result?.summary
    const lineLabel = (line) => (result?.lineColumns || []).map((column) => line.cells?.[column.key]).filter(Boolean).join(' ')

    return (
        <section className='bc-card bc-recon'>
            <div className='bc-report-head'>
                <div>
                    <h3>Reconcile with your own records</h3>
                    <p className='bc-muted'>
                        {reconcile.title} for {periodOf(report.params).from} to {periodOf(report.params).to}. Download the template, fill it in from your records, and import it back.
                        The comparison lists every difference, the transactions behind it on both sides, and how to settle it with a normal posting.
                        An adjustment is only offered for what nothing else explains.
                        The template and the comparison use this report's filters as they are set above; anything outside them is set aside.
                    </p>
                </div>
                <div className='bc-actions'>
                    <button type='button' className='bc-button' disabled={!!busy} onClick={downloadTemplate}>{busy === 'template' ? 'Preparing...' : 'Download template'}</button>
                    <label className='bc-button bc-button-primary bc-einv-upload'>
                        {busy === 'import' ? 'Comparing...' : 'Import filled template'}
                        <input type='file' accept='.xlsx,.xls' aria-label='Import filled template' disabled={!!busy} onChange={importFile} />
                    </label>
                </div>
            </div>

            {error && <div className='bc-banner bc-banner-error'>{error}</div>}
            {mappingNote && <div className='bc-banner bc-banner-info'>{mappingNote}</div>}
            {usedMapping && !mapper && (
                <div className='bc-banner bc-banner-info'>
                    Read {usedMapping.fileName} with the mapping saved for this layout{usedMapping.savedAt ? ` (last used ${new Date(usedMapping.savedAt).toLocaleDateString()})` : ''}.
                    {' '}<button type='button' className='bc-link-button' onClick={() => setMapper({ fileName: usedMapping.fileName, sheets: usedMapping.sheets, columns: usedMapping.columns, initial: usedMapping.plan })}>Change the mapping</button>
                    {' '}<button type='button' className='bc-link-button' onClick={forgetMapping}>Forget it</button>
                </div>
            )}
            {mapper && <BCReconcileMapper key={mapper.fileName} fileName={mapper.fileName} sheets={mapper.sheets} columns={mapper.columns} initial={mapper.initial} busy={busy === 'import'} onCompare={compareMapped} onCancel={() => setMapper(null)} />}
            <BCPreparing progress={preparing} />
            <BCUpdating since={updating} />

            {viewing && (
                <div className='bc-banner bc-banner-info' role='status'>
                    Looking at a past reconciliation: {viewing.file?.name || 'a file'}, run by {viewing.user || 'someone'} on {new Date(viewing.createdAt).toLocaleString()}, for {viewing.params?.from} to {viewing.params?.to}.
                    {' '}Read as: {READ_AS[viewing.file?.read] || READ_AS.template}{viewing.file?.mappingName ? ` (${viewing.file.mappingName})` : ''}.
                    {' '}<button type='button' className='bc-link-button' onClick={closeRun}>Close it</button>
                </div>
            )}

            {result && (
                <div className='bc-recon-export'>
                    <p><strong>{verdictOf(result)}</strong></p>
                    {result.filters?.length > 0 && <p className='bc-muted'>Filters: {result.filters.map((entry) => `${entry.label} ${entry.value}`).join('; ')}</p>}
                    <div className='bc-actions'>
                        <button type='button' className='bc-button' disabled={!!busy} onClick={() => exportAll('excel')}>{busy === 'excel' ? 'Preparing...' : 'Download the reconciliation (Excel)'}</button>
                        <button type='button' className='bc-button' disabled={!!busy} onClick={() => exportAll('pdf')}>{busy === 'pdf' ? 'Preparing...' : 'Download the reconciliation (PDF)'}</button>
                        {mayDelete && savedRunId && <button type='button' className='bc-button bc-button-danger' disabled={!!busy} onClick={() => removeRun({ id: savedRunId, file: imported?.file, createdAt: viewing?.createdAt })}>Delete this run</button>}
                    </div>
                    <p className='bc-muted'>Every line, difference, transaction, Business Central entry and step to settle it, to review before posting anything.</p>
                </div>
            )}

            {result?.problems && (
                <div className='bc-banner bc-banner-error'>
                    <p><strong>{result.problemCount} {result.problemCount === 1 ? 'cell needs' : 'cells need'} fixing in {fileName} before it can be compared.</strong> Nothing was compared, so no advice is given on figures that were read wrongly.</p>
                    <div className='bc-table-scroll'>
                        <table className='bc-table'>
                            <thead><tr><th>Sheet</th><th>Row</th><th>Problem</th></tr></thead>
                            <tbody>{result.problems.map((problem, index) => <tr key={`${problem.sheet}-${problem.row}-${index}`}><td>{problem.sheet}</td><td>{problem.row}</td><td>{problem.message}</td></tr>)}</tbody>
                        </table>
                    </div>
                </div>
            )}
            {result?.problems && imported && (
                <details className='bc-recon-entries' open={!!viewing}>
                    <summary>What was imported</summary>
                    <ImportedData input={imported.input} original={imported.original} file={imported.file} onError={setError} />
                </details>
            )}

            {result && !result.problems && (
                <>
                    <div className='bc-banner bc-banner-info'>
                        Compared {fileName} for {result.params.from} to {result.params.to}{result.periodFrom === 'template' ? ', the period the template was made for' : ''}.
                        Differences are your figure less Business Central&apos;s: a plus means your sheet is higher.
                        {(result.notes || []).map((note) => <span key={note}> {note}</span>)}
                    </div>
                    <StatCardGrid min={170}>
                        <StatCard label='Lines that agree' value={summary.agree.toLocaleString()} description={`of ${(summary.agree + summary.differ + summary.notInBc).toLocaleString()} compared`} tone={summary.differ ? 'default' : 'success'} />
                        <StatCard label='Lines with a difference' value={summary.differ.toLocaleString()} tone={summary.differ ? 'error' : 'default'} />
                        <StatCard label='Transactions matched' value={summary.matched.toLocaleString()} description={summary.sheetTransactions ? `of ${summary.sheetTransactions.toLocaleString()} on your sheet` : 'No transactions listed'} />
                        <StatCard label='On your sheet only' value={summary.onlyOnSheet.toLocaleString()} description='To post, or take off your sheet' tone={summary.onlyOnSheet ? 'warning' : 'default'} />
                        <StatCard label='In Business Central only' value={summary.onlyInBc.toLocaleString()} description='To add to your sheet, or reverse' tone={summary.onlyInBc ? 'warning' : 'default'} />
                        <StatCard label='Last resort adjustments' value={summary.lastResort.toLocaleString()} description='Only after everything else' tone={summary.lastResort ? 'error' : 'success'} />
                    </StatCardGrid>

                    <div className='bc-recon-filters' role='group' aria-label='Show what to do'>
                        <button type='button' className={`bc-chip${actionFilter ? '' : ' active'}`} onClick={() => setActionFilter('')}>Everything ({summary.findings})</button>
                        {ACTIONS.filter((action) => summary.byAction[action.key]).map((action) => (
                            <button key={action.key} type='button' className={`bc-chip${actionFilter === action.key ? ' active' : ''}`} onClick={() => setActionFilter(actionFilter === action.key ? '' : action.key)}>
                                {action.label} ({summary.byAction[action.key]})
                            </button>
                        ))}
                    </div>

                    <div className='bc-report-head'>
                        <nav className='bc-tabs bc-tabs-inner' aria-label='Reconciliation results'>
                            {[['lines', `By line (${lines.length})`], ['findings', `What to do (${findings.length})`], ['transactions', `Transactions (${transactions.length})`], ...(imported ? [['imported', 'What was imported']] : [])].map(([key, label]) => (
                                <button key={key} type='button' className={tab === key ? 'active' : ''} aria-current={tab === key ? 'page' : undefined} onClick={() => setTab(key)}>{label}</button>
                            ))}
                        </nav>
                    </div>

                    {tab === 'lines' && (
                        <>
                            <label className='bc-einv-switch'>
                                <input type='checkbox' checked={onlyDifferences} onChange={(event) => setOnlyDifferences(event.target.checked)} />
                                <span>Only lines that do not agree</span>
                            </label>
                            {lines.length ? (
                                <div className='bc-table-scroll'>
                                    <table className='bc-table bc-recon-lines'>
                                        <thead>
                                            <tr>
                                                {result.lineColumns.map((column) => <th key={column.key}>{column.label}</th>)}
                                                <th>Status</th>
                                                {headline && <><th>{headline.label}: BC</th><th>Yours</th><th>Difference</th></>}
                                                {result.lines.some((line) => line.unexplained !== null) && <th>Not explained</th>}
                                                <th>Findings</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {lines.map((line) => {
                                                const figure = line.figures.find((entry) => entry.key === headline?.key)
                                                const open = openLine === line.key
                                                return [
                                                    <tr key={line.key} className={open ? 'bc-row-open' : ''}>
                                                        {result.lineColumns.map((column) => <td key={column.key}>{line.cells?.[column.key] || ''}</td>)}
                                                        <td><span className={`bc-status bc-status-${STATUS_TONE[line.status] || 'muted'}`}>{line.status}</span></td>
                                                        {headline && <><td>{formatValue(figure?.erp, headline.measure)}</td><td>{formatValue(figure?.sheet, headline.measure)}</td><td>{signed(figure?.difference, headline.measure)}</td></>}
                                                        {result.lines.some((entry) => entry.unexplained !== null) && <td>{signed(line.unexplained, result.measure)}</td>}
                                                        <td>
                                                            {line.findings.length > 0 || line.figures.length > 0
                                                                ? <button type='button' className='bc-link-button' aria-expanded={open} onClick={() => setOpenLine(open ? '' : line.key)}>{open ? 'Hide' : `Show ${line.findings.length || 'figures'}`}</button>
                                                                : null}
                                                        </td>
                                                    </tr>,
                                                    open && (
                                                        <tr key={`${line.key}-detail`} className='bc-recon-detail'>
                                                            <td colSpan={result.lineColumns.length + 6}>
                                                                <h4>{lineLabel(line)}</h4>
                                                                <div className='bc-table-scroll'>
                                                                    <table className='bc-table'>
                                                                        <thead><tr><th>Figure</th><th>Business Central</th><th>Your sheet</th><th>Difference</th></tr></thead>
                                                                        <tbody>
                                                                            {line.figures.map((entry) => (
                                                                                <tr key={entry.key}>
                                                                                    <td>{entry.label}{entry.workedOut ? ' (worked out from your figures)' : ''}</td>
                                                                                    <td>{formatValue(entry.erp, entry.measure)}</td>
                                                                                    <td>{entry.sheet === null ? <span className='bc-muted'>not given</span> : formatValue(entry.sheet, entry.measure)}</td>
                                                                                    <td>{signed(entry.difference, entry.measure)}</td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                                {line.findings.map((id) => findingsById.get(id)).filter(Boolean).map((finding) => <Finding key={finding.id} finding={finding} measure={result.measure} />)}
                                                            </td>
                                                        </tr>
                                                    ),
                                                ]
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : <p className='bc-empty'>{onlyDifferences ? 'Every line agrees.' : 'No lines to show.'}</p>}
                        </>
                    )}

                    {tab === 'findings' && (findings.length
                        ? findings.map((finding) => (
                            <div key={finding.id} className='bc-recon-group'>
                                <p className='bc-muted'>{(() => { const line = result.lines.find((entry) => entry.key === finding.lineKey); return line ? lineLabel(line) : finding.lineKey })()}</p>
                                <Finding finding={finding} measure={result.measure} />
                            </div>
                        ))
                        : <p className='bc-empty'>Nothing to do.</p>)}

                    {tab === 'transactions' && (transactions.length
                        ? <BCDataTable columns={TRANSACTION_COLUMNS} rows={transactions} totals={{}} filterable manageColumns />
                        : <p className='bc-empty'>No transactions were listed on your sheet, so none were paired. Fill in the Your transactions sheet to pin each difference to a document.</p>)}

                    {tab === 'imported' && imported && <ImportedData input={imported.input} original={imported.original} file={imported.file} onError={setError} />}
                </>
            )}

            {/* Every run is kept, with its file and result, to look at again. */}
            {seesHistory && history !== null && (
                <section className='bc-recon-history' aria-label='Past reconciliations of this report'>
                    <h4>Past reconciliations of this report</h4>
                    <p className='bc-muted'>
                        {everyone ? 'Everyone\'s runs' : 'The runs you made'} for {period.from} to {period.to}: those whose period overlaps the report&apos;s date filter. Change the dates above to see others.
                        {everyone ? '' : ' An admin can see everyone\'s.'}
                    </p>
                    {history.length === 0 ? <p className='bc-muted'>None for this period. Each file imported here is kept, with what was read from it and the result, so it can be opened again.</p> : (
                        <div className='bc-table-scroll'>
                            <table className='bc-table'>
                                <thead><tr><th>Run on</th><th>By</th><th>File</th><th>Period</th><th>Read as</th><th>Result</th><th /></tr></thead>
                                <tbody>
                                    {history.map((run) => (
                                        <tr key={run.id} className={viewing?.id === run.id ? 'bc-row-open' : ''}>
                                            <td>{new Date(run.createdAt).toLocaleString()}</td>
                                            <td>{run.user}</td>
                                            <td>{run.file?.name}</td>
                                            <td>{run.params?.from} to {run.params?.to}</td>
                                            <td>{READ_AS[run.file?.read] || READ_AS.template}{run.file?.mappingName ? ` (${run.file.mappingName})` : ''}</td>
                                            <td>{runOutcome(run.summary)}</td>
                                            <td className='bc-recon-history-actions'>
                                                <button type='button' className='bc-link-button' disabled={!!busy} onClick={() => openRun(run.id)} aria-label={`Open the reconciliation of ${run.file?.name || 'a file'} from ${new Date(run.createdAt).toLocaleString()}`}>Open</button>
                                                {mayDelete && <button type='button' className='bc-link-button' disabled={!!busy} onClick={() => removeRun(run)} aria-label={`Delete the reconciliation of ${run.file?.name || 'a file'} from ${new Date(run.createdAt).toLocaleString()}`}>Delete</button>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            )}
        </section>
    )
}

export default BCReconcile
