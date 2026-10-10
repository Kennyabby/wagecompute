import { useContext, useMemo, useState } from 'react'
import ContextProvider from '../../Resources/ContextProvider'
import StatCard from '../Shared/ui/StatCard'
import StatCardGrid from '../Shared/ui/StatCardGrid'
import BCDataTable from './BCDataTable'
import { companyInfoFrom, exportTable } from './bcExport'
import { formatValue, todayString } from './bcFormat'
import BCPreparing, { BCUpdating, usePreparingRetry } from './BCPreparing'
import { ROLES, TEMPLATE_EXAMPLE, TEMPLATE_HEADERS, TEMPLATE_NOTES, findHeaderRow, guessMapping, sampleRows, toLines, validateStatement } from './bcStatement'

// The spreadsheet library is large and only needed here, so it is fetched
// when someone actually opens a file or asks for the template.
const loadSpreadsheets = () => import('xlsx')

const RESULT_TABS = [
    { key: 'statementOnly', label: 'On the statement, not posted', hint: 'The bank has these and Business Central does not. They still need posting.' },
    { key: 'ledgerOnly', label: 'Posted, not on the statement', hint: 'In Business Central for these dates, with nothing on the statement to match. Not yet at the bank, or posted to the wrong account.' },
    { key: 'amountDiffers', label: 'Amount does not match', hint: 'Tied together by their reference, but the amounts differ.' },
    { key: 'duplicateLines', label: 'Repeated on the statement', hint: 'Same date, amount, description and reference more than once.' },
    { key: 'duplicateEntries', label: 'Possible duplicate postings', hint: 'Same date, amount and counterparty posted on more than one document.' },
    { key: 'matched', label: 'Matched', hint: 'On both sides and agreeing.' },
]

const Findings = ({ tone, heading, findings, describeRows }) => (findings.length ? (
    <div className={`bc-findings bc-findings-${tone}`}>
        <h4>{heading}</h4>
        <ul>
            {findings.map((finding) => (
                <li key={finding.title}>
                    <strong>{finding.title}.</strong> {finding.detail}
                    {finding.rows.length > 0 && <span className='bc-findings-rows'> Spreadsheet {finding.rows.length === 1 ? 'row' : 'rows'}: {describeRows(finding.rows)}.</span>}
                </li>
            ))}
        </ul>
    </div>
) : null)

/**
 * Importing a bank statement and matching it against a bank account's
 * entries in Business Central. The file is read in the browser, checked,
 * and only then sent for matching. Nothing is saved on the server.
 */
const BCBankStatement = ({ api, lookups }) => {
    const context = useContext(ContextProvider)
    const { setAlert, setAlertState, setAlertTimeout } = context
    const banks = lookups?.banks || []
    const [bankAccountNo, setBankAccountNo] = useState('')
    const [file, setFile] = useState(null)
    const [headerRow, setHeaderRow] = useState(0)
    const [mapping, setMapping] = useState(null)
    const [order, setOrder] = useState('dmy')
    const [tolerance, setTolerance] = useState(3)
    const [result, setResult] = useState(null)
    const [tab, setTab] = useState('statementOnly')
    const [busy, setBusy] = useState('')
    const [error, setError] = useState('')
    const [view, setView] = useState(null)
    const { preparing, updating, awaitData } = usePreparingRetry()

    const say = (type, message) => { setAlertState(type); setAlert(message); setAlertTimeout(6000) }

    const downloadTemplate = async () => {
        try {
            const XLSX = await loadSpreadsheets()
            const book = XLSX.utils.book_new()
            const statement = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, ...TEMPLATE_EXAMPLE])
            statement['!cols'] = [{ wch: 12 }, { wch: 42 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 14 }]
            XLSX.utils.book_append_sheet(book, statement, 'Statement')
            const notes = XLSX.utils.aoa_to_sheet(TEMPLATE_NOTES)
            notes['!cols'] = [{ wch: 110 }]
            XLSX.utils.book_append_sheet(book, notes, 'How to fill this in')
            XLSX.writeFile(book, 'bank-statement-template.xlsx')
        } catch (failure) {
            say('error', 'The template could not be created. Please try again.')
        }
    }

    const openFile = async (event) => {
        const chosen = event.target.files?.[0]
        event.target.value = ''
        if (!chosen) return
        setError('')
        setResult(null)
        try {
            const XLSX = await loadSpreadsheets()
            const book = XLSX.read(await chosen.arrayBuffer(), { type: 'array', cellDates: true })
            const sheetName = book.SheetNames[0]
            const rows = XLSX.utils.sheet_to_json(book.Sheets[sheetName], { header: 1, raw: true, defval: '' })
            if (!rows.length) { setFile(null); setError(`"${chosen.name}" has nothing on its first sheet.`); return }
            const found = findHeaderRow(rows)
            setFile({ name: chosen.name, sheetName, sheets: book.SheetNames.length, rows })
            setHeaderRow(found)
            setMapping(guessMapping(rows[found] || []))
        } catch (failure) {
            setFile(null)
            setError(`"${chosen.name}" could not be read as a spreadsheet. Save it as .xlsx or .csv and try again.`)
        }
    }

    const headers = useMemo(() => (file ? (file.rows[headerRow] || []).map((cell, index) => (String(cell ?? '').trim() || `Column ${index + 1}`)) : []), [file, headerRow])
    const analysis = useMemo(() => {
        if (!file || !mapping) return null
        return validateStatement({ lines: toLines(file.rows, headerRow, mapping, order), mapping, bankAccountNo, today: todayString() })
    }, [file, headerRow, mapping, order, bankAccountNo])

    const changeHeaderRow = (value) => {
        const next = Math.min(Math.max(Number(value) - 1 || 0, 0), Math.max(file.rows.length - 1, 0))
        setHeaderRow(next)
        setMapping(guessMapping(file.rows[next] || []))
        setResult(null)
    }

    const match = async () => {
        setBusy('match')
        setError('')
        try {
            const response = await awaitData(() => api.matchStatement({
                bankAccountNo,
                toleranceDays: tolerance,
                lines: analysis.lines.map(({ line, date, description, reference, amount, balance }) => ({ line, date, description, reference, amount, balance })),
            }), (fresh) => setResult(fresh.result))
            setResult(response.result)
            setTab(RESULT_TABS.find((entry) => response.result.tables[entry.key].rows.length)?.key || 'matched')
        } catch (failure) {
            setError(failure.message)
        } finally {
            setBusy('')
        }
    }

    const runExport = async (kind) => {
        const table = result.tables[tab]
        setBusy(kind)
        try {
            await exportTable({
                kind,
                title: `Bank statement: ${RESULT_TABS.find((entry) => entry.key === tab).label} (${result.bank.name || result.bank.bankAccountNo})`,
                columns: view?.columns || table.columns,
                rows: view?.rows || table.rows,
                totals: view?.totals || table.totals,
                dateRange: { startDate: result.from, endDate: result.to },
                filters: { 'Bank account': `${result.bank.bankAccountNo} ${result.bank.name}`.trim(), Statement: file?.name || '', ...Object.fromEntries(Object.entries(view?.filters || {}).map(([label, value]) => [`Filtered by ${label}`, value])) },
                companyInfo: companyInfoFrom(context),
            })
        } catch (failure) {
            say('error', 'The export could not be created. Please try again.')
        } finally {
            setBusy('')
        }
    }

    const summary = result?.summary
    const table = result?.tables[tab]

    return (
        <div className='bc-page'>
            <section className='bc-card'>
                <div className='bc-report-head'>
                    <div>
                        <h3>Match a bank statement</h3>
                        <p className='bc-muted'>
                            Import a statement to see which of its lines are missing from Business Central, which postings never reached the bank,
                            and which do not agree. The file is checked before anything is matched, and it is not kept afterwards.
                        </p>
                    </div>
                    <div className='bc-actions'>
                        <button type='button' className='bc-button' onClick={downloadTemplate}>Download template</button>
                    </div>
                </div>
                <div className='bc-form-grid'>
                    <label className='bc-field'>
                        <span className='bc-field-label'>Bank account</span>
                        <select className='bc-input' aria-label='Bank account' value={bankAccountNo} onChange={(event) => { setBankAccountNo(event.target.value); setResult(null) }}>
                            <option value=''>{banks.length ? 'Choose a bank account' : 'Bank accounts are still being read'}</option>
                            {banks.map((bank) => <option key={bank.value} value={bank.value}>{bank.label}</option>)}
                        </select>
                    </label>
                    <label className='bc-field'>
                        <span className='bc-field-label'>Statement file (.xlsx, .xls or .csv)</span>
                        <input className='bc-input' type='file' accept='.xlsx,.xls,.csv' onChange={openFile} aria-label='Statement file' />
                    </label>
                    <label className='bc-field bc-field-narrow'>
                        <span className='bc-field-label'>Match within (days)</span>
                        <input className='bc-input' type='number' min={0} max={31} value={tolerance} onChange={(event) => { setTolerance(Math.min(Math.max(Number(event.target.value) || 0, 0), 31)); setResult(null) }} title='A line and an entry with the same amount are matched when their dates are this close' />
                    </label>
                </div>
                <p className='bc-muted'>
                    Use your bank's own export, or fill in the template. Banks often date a line a day or two after it was posted, which is what "match within" allows for.
                </p>
            </section>

            {error && <div className='bc-banner bc-banner-error'>{error}</div>}

            {file && mapping && (
                <section className='bc-card'>
                    <h3>Columns in {file.name}</h3>
                    <p className='bc-muted'>
                        Sheet "{file.sheetName}"{file.sheets > 1 ? `, the first of ${file.sheets}` : ''}. The headings were found on row {headerRow + 1}. Check each column below is the right one.
                    </p>
                    <div className='bc-form-grid'>
                        <label className='bc-field bc-field-narrow'>
                            <span className='bc-field-label'>Heading row</span>
                            <input className='bc-input' type='number' min={1} max={file.rows.length} value={headerRow + 1} onChange={(event) => changeHeaderRow(event.target.value)} />
                        </label>
                        <label className='bc-field'>
                            <span className='bc-field-label'>A date like 03/04/2026 is</span>
                            <select className='bc-input' value={order} onChange={(event) => { setOrder(event.target.value); setResult(null) }}>
                                <option value='dmy'>3 April (day first)</option>
                                <option value='mdy'>4 March (month first)</option>
                            </select>
                        </label>
                        {ROLES.map((role) => (
                            <label key={role.key} className='bc-field' title={role.hint}>
                                <span className='bc-field-label'>{role.label}{role.required ? ' (required)' : ''}</span>
                                <select className='bc-input' value={mapping[role.key]} onChange={(event) => { setMapping({ ...mapping, [role.key]: Number(event.target.value) }); setResult(null) }} aria-label={`Column for ${role.label}`}>
                                    <option value={-1}>Not in this file</option>
                                    {headers.map((header, index) => <option key={index} value={index}>{header}</option>)}
                                </select>
                            </label>
                        ))}
                    </div>
                    <div className='bc-table-scroll'>
                        <table className='bc-table'>
                            <thead><tr><th>Row</th>{headers.map((header, index) => <th key={index}>{header}</th>)}</tr></thead>
                            <tbody>
                                {sampleRows(file.rows, headerRow).map((row, index) => (
                                    <tr key={index}>
                                        <td>{headerRow + index + 2}</td>
                                        {headers.map((header, at) => <td key={at}>{row[at] instanceof Date ? row[at].toLocaleDateString() : String(row[at] ?? '')}</td>)}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            {analysis && (
                <section className='bc-card'>
                    <div className='bc-report-head'>
                        <div>
                            <h3>Check of the file</h3>
                            <p className={`bc-verdict ${analysis.ok ? 'bc-verdict-ok' : 'bc-verdict-stop'}`} role='status'>
                                {analysis.ok
                                    ? `Ready to match${analysis.warnings.length ? `, with ${analysis.warnings.length} ${analysis.warnings.length === 1 ? 'thing' : 'things'} to look at first` : '. Nothing was found wrong with the file'}.`
                                    : `Not ready to match. ${analysis.errors.length} ${analysis.errors.length === 1 ? 'thing has' : 'things have'} to be put right first.`}
                            </p>
                        </div>
                        <div className='bc-actions'>
                            <button type='button' className='bc-button bc-button-primary' disabled={!analysis.ok || !!busy} onClick={match}>{busy === 'match' ? 'Matching...' : 'Match against Business Central'}</button>
                        </div>
                    </div>
                    {analysis.stats.usable > 0 && (
                        <StatCardGrid min={170}>
                            <StatCard label='Lines to match' value={analysis.stats.usable.toLocaleString()} description={analysis.stats.rows > analysis.stats.usable ? `${analysis.stats.rows - analysis.stats.usable} more cannot be used` : 'Every line with a date or an amount'} />
                            <StatCard label='Period' value={analysis.stats.from === analysis.stats.to ? analysis.stats.from : `${analysis.stats.from} to ${analysis.stats.to}`} />
                            <StatCard label='Money in' value={formatValue(analysis.stats.moneyIn, 'money')} />
                            <StatCard label='Money out' value={formatValue(analysis.stats.moneyOut, 'money')} />
                            <StatCard label='Net movement' value={formatValue(analysis.stats.net, 'money')} />
                        </StatCardGrid>
                    )}
                    <Findings tone='error' heading='To put right before matching' findings={analysis.errors} describeRows={analysis.describeRows} />
                    <Findings tone='warn' heading='To look at' findings={analysis.warnings} describeRows={analysis.describeRows} />
                    <Findings tone='ok' heading='Checked and fine' findings={analysis.passed} describeRows={analysis.describeRows} />
                </section>
            )}

            <BCPreparing progress={preparing} />
            <BCUpdating since={updating} />

            {result && summary && (
                <>
                    <StatCardGrid min={180}>
                        <StatCard label='Matched' value={summary.matched.toLocaleString()} description={`of ${summary.statementLines.toLocaleString()} statement lines`} />
                        <StatCard label='On the statement, not posted' value={summary.statementOnly.toLocaleString()} description={`Net ${formatValue(summary.statementOnlyAmount, 'money')}`} tone={summary.statementOnly ? 'warning' : 'default'} />
                        <StatCard label='Posted, not on the statement' value={summary.ledgerOnly.toLocaleString()} description={`Net ${formatValue(summary.ledgerOnlyAmount, 'money')}`} tone={summary.ledgerOnly ? 'warning' : 'default'} />
                        <StatCard label='Amount does not match' value={summary.amountDiffers.toLocaleString()} description={`Off by ${formatValue(summary.amountDifference, 'money')}`} tone={summary.amountDiffers ? 'error' : 'default'} />
                        <StatCard label='Statement less Business Central' value={formatValue(summary.difference, 'money')} description={`${formatValue(summary.statementTotal, 'money')} against ${formatValue(summary.ledgerTotal, 'money')}`} tone={Math.abs(summary.difference) >= 0.01 ? 'error' : 'success'} />
                    </StatCardGrid>
                    <section className='bc-card'>
                        <div className='bc-report-head'>
                            <div>
                                <h3>{result.bank.bankAccountNo} {result.bank.name}</h3>
                                <p className='bc-muted'>
                                    {result.from} to {result.to}. Matched by reference first, then by amount on the same day{result.toleranceDays ? `, then by amount within ${result.toleranceDays} ${result.toleranceDays === 1 ? 'day' : 'days'}` : ''}.
                                </p>
                            </div>
                            <div className='bc-actions'>
                                <button type='button' className='bc-button' disabled={!table.rows.length || !!busy} onClick={() => runExport('excel')}>{busy === 'excel' ? 'Exporting...' : 'Export Excel'}</button>
                                <button type='button' className='bc-button' disabled={!table.rows.length || !!busy} onClick={() => runExport('pdf')}>{busy === 'pdf' ? 'Exporting...' : 'Export PDF'}</button>
                            </div>
                        </div>
                        <nav className='bc-tabs bc-tabs-inner' aria-label='Results of the match'>
                            {RESULT_TABS.map((entry) => (
                                <button key={entry.key} type='button' className={tab === entry.key ? 'active' : ''} aria-current={tab === entry.key ? 'page' : undefined} onClick={() => { setTab(entry.key); setView(null) }}>
                                    {entry.label} ({result.tables[entry.key].rows.length.toLocaleString()})
                                </button>
                            ))}
                        </nav>
                        <p className='bc-muted'>{RESULT_TABS.find((entry) => entry.key === tab).hint}</p>
                        {table.rows.length
                            ? <BCDataTable key={tab} columns={table.columns} rows={table.rows} totals={table.totals} filterable manageColumns onView={setView} />
                            : <p className='bc-empty'>Nothing here.</p>}
                    </section>
                </>
            )}
        </div>
    )
}

export default BCBankStatement
