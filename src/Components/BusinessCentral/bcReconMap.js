// Importing a file of the person's own into a reconciliation: finding its
// heading row, matching its columns to the ones the reconciliation reads,
// and checking every cell before anything is sent. Plain functions over
// rows of cells, so they can be tested without a file.
//
// The rules for reading a cell are the server's: dates are read day first,
// numbers may carry thousands separators and brackets for negatives, and a
// blank is "not given", never zero. The server checks again on import; this
// is so the person sees every problem before pressing Compare.

const MAX_EXAMPLES = 3
const MAX_ROWS_LISTED = 8

export const squash = (value) => String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
const blank = (value) => value === undefined || value === null || String(value).trim() === ''
const pad = (value) => String(value).padStart(2, '0')
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

const validDate = (year, month, day) => {
    if (!(year >= 1990 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31)) return ''
    const made = new Date(Date.UTC(year, month - 1, day))
    return made.getUTCMonth() === month - 1 ? `${year}-${pad(month)}-${pad(day)}` : ''
}

/** A cell as 'YYYY-MM-DD', '' when blank, or null when it is not a date. */
export const readDate = (value) => {
    if (blank(value)) return ''
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
    if (typeof value === 'number') {
        if (value < 20000 || value > 80000) return null
        return new Date(Date.UTC(1899, 11, 30) + Math.round(value) * 86400000).toISOString().slice(0, 10)
    }
    const raw = String(value).trim()
    let found = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
    if (found) return validDate(+found[1], +found[2], +found[3]) || null
    found = raw.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/)
    if (found) return validDate(found[3].length === 2 ? 2000 + Number(found[3]) : Number(found[3]), +found[2], +found[1]) || null
    found = raw.match(/^(\d{1,2})[\s-]([A-Za-z]{3})[A-Za-z]*[\s-,]+(\d{4})$/)
    if (found && MONTHS.includes(found[2].toLowerCase())) return validDate(+found[3], MONTHS.indexOf(found[2].toLowerCase()) + 1, +found[1]) || null
    return null
}

/** A cell as a number, null when blank, NaN when it is not one. */
export const readNumber = (value) => {
    if (blank(value)) return null
    if (typeof value === 'number') return Number.isFinite(value) ? value : NaN
    let raw = String(value).trim().replace(/[,\s]/g, '').replace(/^(NGN|N|₦|\$)/i, '')
    let sign = 1
    if (/^\(.*\)$/.test(raw)) { sign = -1; raw = raw.slice(1, -1) }
    if (/-$/.test(raw)) { sign = -1; raw = raw.slice(0, -1) }
    if (raw === '' || raw === '-') return null
    const parsed = Number(raw)
    return Number.isFinite(parsed) ? sign * parsed : NaN
}

/** The first row that looks like headings: two or more cells of text. */
export const findHeaderRow = (rows) => {
    for (let at = 0; at < Math.min(rows.length, 15); at += 1) {
        const cells = (rows[at] || []).filter((cell) => !blank(cell))
        if (cells.length >= 2 && cells.filter((cell) => typeof cell === 'string' && Number.isNaN(Number(cell))).length >= 2) return at
    }
    return 0
}

/**
 * Each column the reconciliation reads, matched to a column of the file by
 * its heading: the same words first, then one containing the other.
 * Returns { columnKey: index } with -1 for "not in this file".
 */
export const guessMapping = (header, columns) => {
    const names = (header || []).map(squash)
    const taken = new Set()
    const mapping = {}
    const pick = (test) => names.findIndex((name, index) => name && !taken.has(index) && test(name))
    columns.forEach((column) => {
        const words = [column.label, column.key, ...(column.aliases || [])].map(squash).filter(Boolean)
        let index = pick((name) => words.includes(name))
        if (index < 0) index = pick((name) => words.some((word) => word.length >= 3 && (name.includes(word) || word.includes(name))))
        if (index >= 0) taken.add(index)
        mapping[column.key] = index
    })
    return mapping
}

const rowsText = (rows) => `${rows.slice(0, MAX_ROWS_LISTED).join(', ')}${rows.length > MAX_ROWS_LISTED ? ` and ${rows.length - MAX_ROWS_LISTED} more` : ''}`

/**
 * Every problem with a mapped sheet, by column. `rows` are the sheet's
 * cells, `headerAt` its heading row. Errors stop the import; warnings are
 * shown and do not. Row numbers are as the spreadsheet shows them.
 */
export const checkMapping = ({ rows, headerAt, mapping, columns }) => {
    const errors = []
    const warnings = []
    const header = rows[headerAt] || []
    const data = rows.slice(headerAt + 1).map((cells, offset) => ({ cells: cells || [], line: headerAt + offset + 2 }))
        .filter((entry) => columns.some((column) => mapping[column.key] >= 0 && !blank(entry.cells[mapping[column.key]])))
    columns.forEach((column) => {
        const index = mapping[column.key]
        if (index === undefined || index < 0) {
            if (column.required) errors.push({ column: column.key, label: column.label, message: `"${column.label}" must be filled before comparing. Choose the column of your file that holds it.` })
            return
        }
        const empty = []
        const wrong = []
        const examples = []
        data.forEach(({ cells, line }) => {
            const value = cells[index]
            if (blank(value)) { if (column.required) empty.push(line); return }
            const bad = column.type === 'number' ? Number.isNaN(readNumber(value)) : column.type === 'date' ? readDate(value) === null : false
            if (bad) {
                wrong.push(line)
                if (examples.length < MAX_EXAMPLES) examples.push(String(value))
            }
        })
        if (wrong.length) {
            errors.push({
                column: column.key,
                label: column.label,
                rows: wrong,
                message: column.type === 'number'
                    ? `"${column.label}" (your column "${header[index]}") needs numbers. Row ${rowsText(wrong)} ${wrong.length === 1 ? 'has' : 'have'} ${examples.map((example) => `"${example}"`).join(', ')}.`
                    : `"${column.label}" (your column "${header[index]}") needs dates such as 2026-09-30 or 30/09/2026. Row ${rowsText(wrong)} ${wrong.length === 1 ? 'has' : 'have'} ${examples.map((example) => `"${example}"`).join(', ')}.`,
            })
        }
        if (empty.length) errors.push({ column: column.key, label: column.label, rows: empty, message: `"${column.label}" must be filled on every row. It is empty on row ${rowsText(empty)}. Fill it in, or delete the rows you are not reconciling.` })
    })
    // One column of the file used twice is allowed, but is usually a slip.
    const used = new Map()
    columns.forEach((column) => {
        const index = mapping[column.key]
        if (index >= 0) used.set(index, [...(used.get(index) || []), column.label])
    })
    used.forEach((labels, index) => { if (labels.length > 1) warnings.push(`Your column "${header[index]}" is used for ${labels.join(' and ')}.`) })
    const unused = header.map((name, index) => ({ name, index })).filter((entry) => !blank(entry.name) && !used.has(entry.index))
    if (unused.length) warnings.push(`Not used: ${unused.map((entry) => `"${entry.name}"`).join(', ')}.`)
    if (!data.length) errors.push({ column: '', label: '', message: 'No rows with values were found under the heading row.' })
    return { errors, warnings, rowCount: data.length }
}

/**
 * The mapped sheet laid out the way the template lays it out, with dates
 * and numbers already read, ready for the server.
 */
export const toTemplateSheet = ({ rows, headerAt, mapping, columns }) => {
    const mapped = columns.filter((column) => mapping[column.key] >= 0)
    const data = rows.slice(headerAt + 1).filter((cells) => mapped.some((column) => !blank((cells || [])[mapping[column.key]])))
    return [
        mapped.map((column) => column.label),
        ...data.map((cells) => mapped.map((column) => {
            const value = (cells || [])[mapping[column.key]]
            if (column.type === 'date') return readDate(value) || ''
            if (column.type === 'number') { const number = readNumber(value); return number === null ? '' : number }
            return blank(value) ? '' : String(value).trim()
        })),
    ]
}

/**
 * Whether a workbook is a template from this module that can go as it is:
 * a figures or transactions sheet whose heading row has the required
 * columns by their template names.
 */
export const looksLikeTemplate = (sheets, columns) => ['figures', 'transactions'].some((part) => {
    const name = part === 'figures' ? 'Your figures' : 'Your transactions'
    const rows = sheets[name]
    const wanted = (columns?.[part] || []).filter((column) => column.required)
    if (!rows || !wanted.length) return false
    return rows.slice(0, 15).some((row) => wanted.every((column) => (row || []).some((cell) => squash(cell) === squash(column.label))))
})

// ---- Remembered mappings ----
//
// A mapping is kept by heading name, not by column position, and a file is
// recognised by its headings in any order, the same way the server names it.

const headingSet = (header) => [...new Set((header || []).map(squash).filter(Boolean))].sort().join(',')

/** What is kept of a mapping that passed: sheet, heading row, heading names. */
export const toSavedPart = ({ sheetName, rows, headerAt, mapping }) => {
    const header = (rows[headerAt] || []).map((cell) => String(cell ?? '').trim())
    const byName = {}
    Object.entries(mapping).forEach(([key, index]) => { if (index >= 0 && header[index]) byName[key] = header[index] })
    return { sheetName, headerAt, header, mapping: byName }
}

/**
 * A saved mapping laid over a workbook, when the workbook has the same
 * layout: each part's sheet (by name, or any sheet) with a heading row
 * holding the same headings. Returns the parts ready to check, or null.
 */
export const applySavedMapping = (saved, sheets) => {
    const plan = {}
    for (const [part, kept] of Object.entries(saved.parts || {})) {
        const wanted = headingSet(kept.header)
        const names = [kept.sheetName, ...Object.keys(sheets).filter((name) => name !== kept.sheetName)].filter((name) => sheets[name])
        let found = null
        for (const name of names) {
            const rows = sheets[name]
            const at = rows.slice(0, 15).findIndex((row) => headingSet(row) === wanted)
            if (at >= 0) { found = { sheetName: name, rows, headerAt: at }; break }
        }
        if (!found) return null
        const header = (found.rows[found.headerAt] || []).map(squash)
        const mapping = {}
        Object.entries(kept.mapping || {}).forEach(([key, name]) => { mapping[key] = header.indexOf(squash(name)) })
        plan[part] = { ...found, mapping }
    }
    return Object.keys(plan).length ? plan : null
}
