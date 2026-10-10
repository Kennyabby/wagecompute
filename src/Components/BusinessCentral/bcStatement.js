// Reading a bank statement from a spreadsheet, and judging whether it is fit
// to be matched. Everything here works on plain rows (arrays of cell values),
// so it can be tested without a file and without the spreadsheet library.

export const MAX_LINES = 20000
const SAMPLE_ROWS = 8

// What each column of a statement can be used for.
export const ROLES = [
    { key: 'date', label: 'Date', required: true, hint: 'The day the bank processed the line' },
    { key: 'description', label: 'Description', hint: 'Narration or details' },
    { key: 'reference', label: 'Reference', hint: 'Cheque, transfer or document number' },
    { key: 'moneyIn', label: 'Money in', hint: 'Deposits and credits' },
    { key: 'moneyOut', label: 'Money out', hint: 'Withdrawals and debits' },
    { key: 'amount', label: 'Amount (one signed column)', hint: 'Use this when the file has one amount column, negative for money out' },
    { key: 'balance', label: 'Balance', hint: 'Running balance after the line' },
]

export const TEMPLATE_HEADERS = ['Date', 'Description', 'Reference', 'Money in', 'Money out', 'Balance']
export const TEMPLATE_EXAMPLE = [
    ['2026-09-01', 'Transfer from ALPHA STORES', 'CR04993', 800000, '', 800000],
    ['2026-09-02', 'Payment to PACKAGING SUPPLIES LTD', 'PV00231', '', 250000, 550000],
    ['2026-09-02', 'Bank charges', '', '', 53.75, 549946.25],
]
export const TEMPLATE_NOTES = [
    ['How to fill this in'],
    ['1. Keep the heading row as it is. Put one statement line on each row under it.'],
    ['2. Date: the day the bank processed the line. 2026-09-30 and 30/09/2026 are both read.'],
    ['3. Money in and Money out: plain numbers, one of the two on each row. Leave the other blank.'],
    ['4. Reference: the cheque, transfer or document number if the statement shows one. It makes matching far more reliable.'],
    ['5. Balance is optional. When it is filled in, the import checks that each balance follows from the one before.'],
    ['6. Delete the three example rows before importing.'],
    ['7. One file per bank account. Up to 20,000 lines.'],
]

const HEADER_WORDS = {
    date: /\b(date|value date|trans(action)? date|posting date)\b/i,
    description: /(descr|narrat|detail|particular|remark|memo)/i,
    reference: /(\bref|cheque|check no|doc(ument)? no|instrument)/i,
    moneyIn: /(credit|deposit|money in|paid in|lodg|receipt)/i,
    moneyOut: /(debit|withdraw|money out|paid out|payment)/i,
    amount: /^\s*amount\b|\bamount\s*$/i,
    balance: /balance/i,
}

const blank = (value) => value === undefined || value === null || String(value).trim() === ''
const pad = (number) => String(number).padStart(2, '0')
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

const validDate = (year, month, day) => {
    if (!(year >= 1990 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31)) return ''
    const made = new Date(Date.UTC(year, month - 1, day))
    return made.getUTCMonth() === month - 1 ? `${year}-${pad(month)}-${pad(day)}` : ''
}

/**
 * A cell as a date, 'YYYY-MM-DD', or '' when it cannot be read as one.
 * `order` settles 03/04/2026: 'dmy' reads it as 3 April, 'mdy' as 4 March.
 */
export const readDate = (value, order = 'dmy') => {
    if (blank(value)) return ''
    if (value instanceof Date && !Number.isNaN(value.getTime())) return validDate(value.getFullYear(), value.getMonth() + 1, value.getDate())
    // A spreadsheet stores a date as a count of days. 25569 is 1 January 1970.
    if (typeof value === 'number' && value > 30000 && value < 80000) {
        const made = new Date(Math.round((value - 25569) * 86400000))
        return validDate(made.getUTCFullYear(), made.getUTCMonth() + 1, made.getUTCDate())
    }
    const text = String(value).trim()
    let match = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/)
    if (match) return validDate(Number(match[1]), Number(match[2]), Number(match[3]))
    match = text.match(/^(\d{1,2})[-/. ]([A-Za-z]{3,9})[-/. ,]+(\d{2,4})/)
    if (match) {
        const month = MONTHS.indexOf(match[2].slice(0, 3).toLowerCase()) + 1
        const year = Number(match[3]) < 100 ? 2000 + Number(match[3]) : Number(match[3])
        return month ? validDate(year, month, Number(match[1])) : ''
    }
    match = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/)
    if (match) {
        const year = Number(match[3]) < 100 ? 2000 + Number(match[3]) : Number(match[3])
        const [first, second] = [Number(match[1]), Number(match[2])]
        // A first number over 12 can only be a day, whatever the order asked for.
        const dayFirst = first > 12 ? true : (second > 12 ? false : order !== 'mdy')
        return dayFirst ? validDate(year, second, first) : validDate(year, first, second)
    }
    return ''
}

/**
 * A cell as an amount, or null when it is not a number. Handles thousands
 * separators, currency signs, brackets for negatives and a trailing DR or CR.
 */
export const readAmount = (value) => {
    if (blank(value)) return 0
    if (typeof value === 'number') return Number.isFinite(value) ? value : null
    let text = String(value).trim()
    const negative = /^\(.*\)$/.test(text) || /^-/.test(text) || /-$/.test(text) || /\bDR\b\.?$/i.test(text)
    text = text.replace(/\b(CR|DR)\b\.?/gi, '').replace(/[^0-9.,]/g, '')
    if (!text) return null
    // The last separator is the decimal point when two digits or fewer follow it.
    const lastComma = text.lastIndexOf(',')
    const lastDot = text.lastIndexOf('.')
    if (lastComma > lastDot && text.length - lastComma <= 3) text = `${text.slice(0, lastComma).replace(/[.,]/g, '')}.${text.slice(lastComma + 1)}`
    else text = text.replace(/,/g, '')
    const number = Number(text)
    if (!Number.isFinite(number)) return null
    return negative ? -number : number
}

/** The row that holds the column headings: the first with two or more recognisable ones. */
export const findHeaderRow = (rows) => {
    const limit = Math.min(rows.length, 25)
    for (let index = 0; index < limit; index += 1) {
        const hits = (rows[index] || []).filter((cell) => typeof cell === 'string' && Object.values(HEADER_WORDS).some((pattern) => pattern.test(cell))).length
        if (hits >= 2) return index
    }
    return 0
}

/** Which column each role most likely is, from the headings. -1 means none. */
export const guessMapping = (headers) => {
    const mapping = Object.fromEntries(ROLES.map((role) => [role.key, -1]))
    const taken = new Set()
    // Order matters: "Value date" must not be taken as an amount, and a
    // balance column often has "credit" or "debit" in its name too.
    ;['date', 'balance', 'moneyIn', 'moneyOut', 'amount', 'reference', 'description'].forEach((role) => {
        const index = headers.findIndex((header, at) => !taken.has(at) && HEADER_WORDS[role].test(String(header || '')))
        if (index >= 0) { mapping[role] = index; taken.add(index) }
    })
    // One signed amount column is only used when there are no separate ones.
    if (mapping.moneyIn >= 0 || mapping.moneyOut >= 0) mapping.amount = -1
    return mapping
}

/**
 * Turns the rows under the headings into statement lines. Each line keeps
 * the spreadsheet row it came from and anything wrong with it, so problems
 * can be pointed at.
 */
export const toLines = (rows, headerRow, mapping, order = 'dmy') => {
    const cell = (row, role) => (mapping[role] >= 0 ? row[mapping[role]] : undefined)
    const lines = []
    rows.slice(headerRow + 1).forEach((row, offset) => {
        const sheetRow = headerRow + offset + 2
        if (!row || row.every(blank)) return
        const rawDate = cell(row, 'date')
        const date = readDate(rawDate, order)
        const split = mapping.moneyIn >= 0 || mapping.moneyOut >= 0
        const moneyIn = split ? readAmount(cell(row, 'moneyIn')) : 0
        const moneyOut = split ? readAmount(cell(row, 'moneyOut')) : 0
        const signed = split ? 0 : readAmount(cell(row, 'amount'))
        const balance = mapping.balance >= 0 && !blank(cell(row, 'balance')) ? readAmount(cell(row, 'balance')) : null
        const problems = []
        const amountUnread = moneyIn === null || moneyOut === null || signed === null
        const amount = amountUnread ? 0 : (split ? Math.abs(moneyIn) - Math.abs(moneyOut) : signed)
        const hasAmount = !amountUnread && amount !== 0
        // A row with neither a date nor an amount is a heading, a note or a
        // total, not a statement line.
        if (blank(rawDate) && !hasAmount && !amountUnread) return
        if (!date) problems.push(blank(rawDate) ? 'has an amount but no date' : `has a date that cannot be read ("${String(rawDate).slice(0, 30)}")`)
        if (amountUnread) problems.push('has an amount that is not a number')
        else if (!hasAmount) problems.push('has no amount')
        lines.push({
            line: sheetRow,
            date,
            description: blank(cell(row, 'description')) ? '' : String(cell(row, 'description')).trim(),
            reference: blank(cell(row, 'reference')) ? '' : String(cell(row, 'reference')).trim(),
            amount: Math.round(amount * 100) / 100,
            balance: balance === null ? null : Math.round(balance * 100) / 100,
            bothSides: split && !amountUnread && Math.abs(moneyIn) > 0 && Math.abs(moneyOut) > 0,
            problems,
        })
    })
    return lines
}

const listRows = (rows, limit = 12) => {
    const shown = rows.slice(0, limit).join(', ')
    return rows.length > limit ? `${shown} and ${rows.length - limit} more` : shown
}
const money = (value) => Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/**
 * Whether a statement is fit to be matched, and why. Returns:
 *   ok        nothing stands in the way of matching
 *   errors    things that must be put right first
 *   warnings  things to look at, which do not stop the import
 *   passed    checks the file came through, so the reader sees what was looked at
 *   stats     what the file holds
 * Each finding names the spreadsheet rows it is about.
 */
export const validateStatement = ({ lines, mapping, bankAccountNo, today }) => {
    const errors = []
    const warnings = []
    const passed = []
    const add = (list, title, detail, rows = []) => list.push({ title, detail, rows })

    if (!bankAccountNo) add(errors, 'No bank account chosen', 'Choose the Business Central bank account this statement belongs to.')
    if (mapping.date < 0) add(errors, 'No date column', 'Choose which column holds the date of each line.')
    const split = mapping.moneyIn >= 0 || mapping.moneyOut >= 0
    if (!split && mapping.amount < 0) add(errors, 'No amount column', 'Choose the money in and money out columns, or one signed amount column.')
    else if (split && (mapping.moneyIn < 0 || mapping.moneyOut < 0)) add(warnings, `Only a ${mapping.moneyIn >= 0 ? 'money in' : 'money out'} column is chosen`, `Lines of the other kind will be missed. Choose a ${mapping.moneyIn >= 0 ? 'money out' : 'money in'} column too if the file has one.`)

    const good = lines.filter((line) => !line.problems.length)
    const bad = lines.filter((line) => line.problems.length)
    const stats = { rows: lines.length, usable: good.length, from: '', to: '', moneyIn: 0, moneyOut: 0, net: 0 }
    if (!lines.length && mapping.date >= 0) add(errors, 'No statement lines found', 'Nothing under the heading row has a date or an amount. Check the heading row and the columns chosen.')

    if (bad.length) {
        const unreadDates = bad.filter((line) => line.problems.some((problem) => /date/.test(problem)))
        const unreadAmounts = bad.filter((line) => line.problems.some((problem) => /not a number/.test(problem)))
        const noAmount = bad.filter((line) => line.problems.includes('has no amount'))
        // When most rows fail the same way, the column is the problem, not the rows.
        if (lines.length >= 4 && unreadDates.length > lines.length / 2) add(errors, 'The date column does not look like dates', `${unreadDates.length} of ${lines.length} rows have nothing readable as a date in it. Choose another column, or change how day and month are read.`, unreadDates.map((line) => line.line))
        else if (unreadDates.length) add(errors, `${unreadDates.length} ${unreadDates.length === 1 ? 'row has' : 'rows have'} no readable date`, `Correct the date in the file, or delete the row if it is not a statement line. First: row ${unreadDates[0].line} ${unreadDates[0].problems.find((problem) => /date/.test(problem))}.`, unreadDates.map((line) => line.line))
        if (lines.length >= 4 && unreadAmounts.length > lines.length / 2) add(errors, 'The amount columns do not look like numbers', `${unreadAmounts.length} of ${lines.length} rows have text where an amount should be. Choose other columns.`, unreadAmounts.map((line) => line.line))
        else if (unreadAmounts.length) add(errors, `${unreadAmounts.length} ${unreadAmounts.length === 1 ? 'row has' : 'rows have'} an amount that is not a number`, 'Correct the amount in the file, or delete the row if it is not a statement line.', unreadAmounts.map((line) => line.line))
        if (noAmount.length) add(warnings, `${noAmount.length} ${noAmount.length === 1 ? 'row has' : 'rows have'} a date and no amount`, 'They will be left out. That is right for a line such as "balance brought forward", and wrong if an amount is missing.', noAmount.map((line) => line.line))
    }
    if (good.length > MAX_LINES) add(errors, 'Too many lines for one import', `The file has ${good.length.toLocaleString()} lines and one import takes up to ${MAX_LINES.toLocaleString()}. Split it by month.`)

    if (good.length) {
        const dates = good.map((line) => line.date).sort()
        stats.from = dates[0]
        stats.to = dates[dates.length - 1]
        good.forEach((line) => { if (line.amount > 0) stats.moneyIn += line.amount; else stats.moneyOut -= line.amount })
        stats.moneyIn = Math.round(stats.moneyIn * 100) / 100
        stats.moneyOut = Math.round(stats.moneyOut * 100) / 100
        stats.net = Math.round((stats.moneyIn - stats.moneyOut) * 100) / 100
        add(passed, 'Dates read', `${good.length.toLocaleString()} ${good.length === 1 ? 'line' : 'lines'} from ${stats.from} to ${stats.to}.`)
        add(passed, 'Amounts read', `Money in ${money(stats.moneyIn)}, money out ${money(stats.moneyOut)}, net ${money(stats.net)}.`)

        const future = good.filter((line) => today && line.date > today)
        if (future.length) add(warnings, `${future.length} ${future.length === 1 ? 'line is' : 'lines are'} dated in the future`, 'A date after today usually means day and month were read the wrong way round. Change how dates are read if so.', future.map((line) => line.line))
        const days = Math.round((new Date(`${stats.to}T00:00:00Z`) - new Date(`${stats.from}T00:00:00Z`)) / 86400000)
        if (days > 370) add(warnings, 'The statement covers more than a year', `From ${stats.from} to ${stats.to}. That is unusual for one statement, and can mean some dates were read wrongly.`)

        const both = good.filter((line) => line.bothSides)
        if (both.length) add(warnings, `${both.length} ${both.length === 1 ? 'row has' : 'rows have'} both money in and money out`, 'The line is taken as money in less money out. Check these rows are not two transactions on one line.', both.map((line) => line.line))
        if (!split && mapping.amount >= 0 && good.length >= 5 && good.every((line) => line.amount > 0)) add(warnings, 'Every amount is positive', 'With one amount column, money out has to be negative. If this statement has payments in it, they are being read as receipts.')

        const seen = new Map()
        good.forEach((line) => { const key = `${line.date}|${line.amount}|${line.description.toUpperCase()}|${line.reference.toUpperCase()}`; seen.set(key, [...(seen.get(key) || []), line.line]) })
        const repeats = [...seen.values()].filter((rows) => rows.length > 1)
        if (repeats.length) add(warnings, `${repeats.reduce((sum, rows) => sum + rows.length, 0)} lines appear more than once`, 'Same date, amount, description and reference. They may be genuine (two identical charges on one day), or the same page of the statement may have been pasted twice.', repeats.flat())
        else add(passed, 'No repeated lines', 'No two lines share a date, amount, description and reference.')

        if (mapping.balance >= 0) {
            const withBalance = good.filter((line) => line.balance !== null)
            if (withBalance.length < 2) add(warnings, 'The balance column is mostly empty', 'It cannot be used to check that no line is missing.')
            else {
                // Statements run oldest first or newest first. Try both and
                // take the direction that fits, so either layout checks out.
                const breaks = (ordered) => ordered.slice(1).filter((line, index) => Math.abs(ordered[index].balance + line.amount - line.balance) > 0.011)
                const inFileOrder = good.filter((line) => line.balance !== null)
                const forward = breaks(inFileOrder)
                const backward = breaks([...inFileOrder].reverse())
                const broken = forward.length <= backward.length ? forward : backward
                if (!broken.length) add(passed, 'Balances follow on', `Each balance is the one before plus the line's amount, ending at ${money((forward.length <= backward.length ? inFileOrder[inFileOrder.length - 1] : inFileOrder[0]).balance)}. No line is missing from the file.`)
                else add(warnings, `The balance does not follow on at ${broken.length} ${broken.length === 1 ? 'row' : 'rows'}`, 'The balance on these rows is not the balance before plus the amount. A line is missing or repeated just before each, or money in and money out are swapped.', broken.map((line) => line.line))
            }
        }
        if (!good.some((line) => line.reference) && mapping.reference < 0) add(warnings, 'No reference column', 'Lines will be matched on amount and date only. A reference column makes matching more reliable when the statement has one.')
    }

    return { ok: errors.length === 0 && good.length > 0, errors, warnings, passed, stats, lines: good, describeRows: listRows }
}

export const sampleRows = (rows, headerRow) => rows.slice(headerRow + 1, headerRow + 1 + SAMPLE_ROWS)
