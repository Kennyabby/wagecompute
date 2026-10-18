import { useMemo, useState } from 'react'
import { checkMapping, findHeaderRow, guessMapping, toTemplateSheet } from './bcReconMap'

// Matching the columns of a person's own file to the ones a reconciliation
// reads. Each part (the figures, the transactions) can come from any sheet
// of the file, with its own heading row. Every cell is checked as the
// mapping changes, and Compare stays off until nothing is wrong.

const PARTS = [
    { key: 'figures', title: 'Your figures', hint: 'One row per line: the totals, balances or counts from your records.', sheet: 'Your figures' },
    { key: 'transactions', title: 'Your transactions', hint: 'One row per transaction from your records. Optional, but it pins each difference to a document.', sheet: 'Your transactions' },
]
const TYPE_WORDS = { number: 'number', date: 'date', text: 'text' }

const blank = (value) => value === undefined || value === null || String(value).trim() === ''

// Which sheet looks most like each part: the one whose headings match most
// of the part's required columns.
const guessPlan = (sheets, columns) => {
    const plan = {}
    const used = new Set()
    PARTS.forEach((part) => {
        const wanted = columns[part.key] || []
        if (!wanted.length) return
        let best = null
        Object.entries(sheets).forEach(([name, rows]) => {
            const headerAt = findHeaderRow(rows)
            const mapping = guessMapping(rows[headerAt], wanted)
            const score = wanted.filter((column) => mapping[column.key] >= 0).length + wanted.filter((column) => column.required && mapping[column.key] >= 0).length
            if (score && (!best || score > best.score || (score === best.score && used.has(best.sheetName) && !used.has(name)))) best = { sheetName: name, headerAt, mapping, score }
        })
        if (best) { plan[part.key] = best; used.add(best.sheetName) }
    })
    return plan
}

const BCReconcileMapper = ({ fileName, sheets, columns, initial, busy, onCompare, onCancel }) => {
    const [plan, setPlan] = useState(() => initial || guessPlan(sheets, columns))
    const names = Object.keys(sheets)

    const checks = useMemo(() => Object.fromEntries(PARTS.filter((part) => plan[part.key]?.sheetName).map((part) => {
        const entry = plan[part.key]
        return [part.key, checkMapping({ rows: sheets[entry.sheetName] || [], headerAt: entry.headerAt, mapping: entry.mapping, columns: columns[part.key] })]
    })), [plan, sheets, columns])
    const chosen = PARTS.filter((part) => plan[part.key]?.sheetName)
    const errorCount = Object.values(checks).reduce((total, check) => total + check.errors.length, 0)
    const ready = chosen.length > 0 && errorCount === 0

    const setPart = (part, patch) => setPlan((current) => ({ ...current, [part]: { ...current[part], ...patch } }))
    const chooseSheet = (part, sheetName) => {
        if (!sheetName) { setPlan((current) => { const next = { ...current }; delete next[part]; return next }); return }
        const rows = sheets[sheetName] || []
        const headerAt = findHeaderRow(rows)
        setPart(part, { sheetName, headerAt, mapping: guessMapping(rows[headerAt], columns[part]) })
    }
    const chooseHeader = (part, value) => {
        const entry = plan[part]
        const rows = sheets[entry.sheetName] || []
        const headerAt = Math.min(Math.max((Number(value) || 1) - 1, 0), Math.max(rows.length - 1, 0))
        setPart(part, { headerAt, mapping: guessMapping(rows[headerAt], columns[part]) })
    }

    const compare = () => {
        const built = {}
        const parts = {}
        chosen.forEach((part) => {
            const entry = plan[part.key]
            const rows = sheets[entry.sheetName]
            built[part.sheet] = toTemplateSheet({ rows, headerAt: entry.headerAt, mapping: entry.mapping, columns: columns[part.key] })
            parts[part.key] = { sheetName: entry.sheetName, rows, headerAt: entry.headerAt, mapping: entry.mapping }
        })
        onCompare({ sheets: built, parts })
    }

    return (
        <section className='bc-recon-mapper'>
            <h4>Match the columns of {fileName}</h4>
            <p className='bc-muted'>This file is not laid out like the template, so tell Business Central which of its columns hold what. Columns are matched by their headings where they can be. Once the file passes every check and is compared, the mapping is remembered for files with these headings.</p>
            {PARTS.filter((part) => (columns[part.key] || []).length).map((part) => {
                const entry = plan[part.key]
                const rows = entry ? sheets[entry.sheetName] || [] : []
                const header = entry ? rows[entry.headerAt] || [] : []
                const sample = entry ? rows.slice(entry.headerAt + 1).filter((row) => (row || []).some((cell) => !blank(cell))).slice(0, 3) : []
                const check = checks[part.key]
                return (
                    <div key={part.key} className='bc-recon-map-part'>
                        <div className='bc-recon-map-head'>
                            <strong>{part.title}</strong>
                            <span className='bc-muted'>{part.hint}</span>
                        </div>
                        <div className='bc-recon-map-pick'>
                            <label className='bc-field'>
                                <span className='bc-field-label'>Sheet</span>
                                <select className='bc-input' aria-label={`Sheet for ${part.title}`} value={entry?.sheetName || ''} onChange={(event) => chooseSheet(part.key, event.target.value)}>
                                    <option value=''>Not in this file</option>
                                    {names.map((name) => <option key={name} value={name}>{name}</option>)}
                                </select>
                            </label>
                            {entry && (
                                <label className='bc-field'>
                                    <span className='bc-field-label'>Heading row</span>
                                    <input className='bc-input' type='number' min={1} aria-label={`Heading row for ${part.title}`} value={entry.headerAt + 1} onChange={(event) => chooseHeader(part.key, event.target.value)} />
                                </label>
                            )}
                        </div>
                        {entry && (
                            <div className='bc-table-scroll'>
                                <table className='bc-table'>
                                    <thead><tr><th>Business Central needs</th><th>Kind</th><th>Your column</th><th>First values</th></tr></thead>
                                    <tbody>
                                        {columns[part.key].map((column) => {
                                            const index = entry.mapping[column.key] ?? -1
                                            const bad = check?.errors.some((error) => error.column === column.key)
                                            return (
                                                <tr key={column.key} className={bad ? 'bc-recon-map-bad' : ''}>
                                                    <td>{column.label}{column.required ? <span className='bc-status bc-status-warn'> Required</span> : null}</td>
                                                    <td>{TYPE_WORDS[column.type] || 'text'}</td>
                                                    <td>
                                                        <select className='bc-input' aria-label={`Your column for ${column.label}`} value={index} onChange={(event) => setPart(part.key, { mapping: { ...entry.mapping, [column.key]: Number(event.target.value) } })}>
                                                            <option value={-1}>{column.required ? 'Choose a column' : 'Not in this file'}</option>
                                                            {header.map((name, at) => (blank(name) ? null : <option key={`${name}-${at}`} value={at}>{String(name)}</option>))}
                                                        </select>
                                                    </td>
                                                    <td className='bc-muted'>{index >= 0 ? sample.map((row) => row[index]).filter((value) => !blank(value)).map((value) => (value instanceof Date ? value.toISOString().slice(0, 10) : String(value))).join(', ') : ''}</td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        {part.key === 'transactions' && entry && columns.types?.length > 0 && <p className='bc-muted'>The Type column can say, for example: {columns.types.join(', ')}.</p>}
                        {check?.errors.length > 0 && (
                            <ul className='bc-recon-map-errors'>{check.errors.map((error) => <li key={`${error.column}-${error.message}`}>{error.message}</li>)}</ul>
                        )}
                        {check?.warnings.length > 0 && <ul className='bc-recon-map-warnings'>{check.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>}
                        {check && !check.errors.length && <p className='bc-muted'>{check.rowCount.toLocaleString()} rows read, and every one passes.</p>}
                    </div>
                )
            })}
            <div className='bc-actions'>
                <button type='button' className='bc-button bc-button-primary' disabled={!ready || busy} onClick={compare}>{busy ? 'Comparing...' : 'Compare'}</button>
                <button type='button' className='bc-button' disabled={busy} onClick={onCancel}>Cancel</button>
                {!ready && <span className='bc-muted'>{chosen.length ? `${errorCount} ${errorCount === 1 ? 'thing' : 'things'} to fix first.` : 'Choose the sheet that holds your figures or your transactions.'}</span>}
            </div>
        </section>
    )
}

export default BCReconcileMapper
