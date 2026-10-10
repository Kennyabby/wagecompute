import { findHeaderRow, guessMapping, readAmount, readDate, toLines, validateStatement } from './bcStatement'

const HEADERS = ['Date', 'Description', 'Reference', 'Money in', 'Money out', 'Balance']
const sheet = (...body) => [['ACME BANK PLC'], ['Statement of account 0123456789'], [], HEADERS, ...body]
const check = (rows, extra = {}) => {
    const headerRow = findHeaderRow(rows)
    const mapping = { ...guessMapping(rows[headerRow]), ...(extra.mapping || {}) }
    return validateStatement({ lines: toLines(rows, headerRow, mapping, extra.order), mapping, bankAccountNo: 'bankAccountNo' in extra ? extra.bankAccountNo : 'B-HQ', today: '2026-10-10' })
}
const titles = (list) => list.map((finding) => finding.title)

test('dates and amounts are read in the forms banks write them', () => {
    expect(readDate('2026-09-30')).toBe('2026-09-30')
    expect(readDate('30/09/2026')).toBe('2026-09-30')
    expect(readDate('03/04/2026')).toBe('2026-04-03')
    expect(readDate('03/04/2026', 'mdy')).toBe('2026-03-04')
    // A first number over 12 can only be the day.
    expect(readDate('13/04/2026', 'mdy')).toBe('2026-04-13')
    expect(readDate('30-Sep-26')).toBe('2026-09-30')
    expect(readDate(46295)).toBe('2026-09-30')
    expect(readDate(new Date(2026, 8, 30))).toBe('2026-09-30')
    expect(readDate('31/02/2026')).toBe('')
    expect(readDate('Total')).toBe('')

    expect(readAmount('1,234,567.89')).toBe(1234567.89)
    expect(readAmount('(2,500.00)')).toBe(-2500)
    expect(readAmount('NGN 53.75 DR')).toBe(-53.75)
    expect(readAmount('1.234,50')).toBe(1234.5)
    expect(readAmount('')).toBe(0)
    expect(readAmount('n/a')).toBeNull()
})

test('the heading row and the columns are found under a bank letterhead', () => {
    const rows = sheet(['2026-09-01', 'Deposit', 'CR1', 100, '', 100])
    expect(findHeaderRow(rows)).toBe(3)
    expect(guessMapping(rows[3])).toEqual({ date: 0, description: 1, reference: 2, moneyIn: 3, moneyOut: 4, amount: -1, balance: 5 })
    expect(guessMapping(['Value Date', 'Narration', 'Amount', 'Balance'])).toEqual({ date: 0, description: 1, reference: -1, moneyIn: -1, moneyOut: -1, amount: 2, balance: 3 })
})

test('a clean statement is passed, with what was checked', () => {
    const result = check(sheet(
        ['01/09/2026', 'Deposit', 'CR1', 1000, '', 1000],
        ['02/09/2026', 'Charges', '', '', 50, 950],
        ['', 'Closing balance', '', '', '', ''],
    ))
    expect(result.ok).toBe(true)
    expect(result.errors).toEqual([])
    expect(result.warnings).toEqual([])
    expect(result.stats).toMatchObject({ usable: 2, from: '2026-09-01', to: '2026-09-02', moneyIn: 1000, moneyOut: 50, net: 950 })
    expect(titles(result.passed)).toEqual(['Dates read', 'Amounts read', 'No repeated lines', 'Balances follow on'])
    expect(result.lines.map((line) => [line.line, line.date, line.amount])).toEqual([[5, '2026-09-01', 1000], [6, '2026-09-02', -50]])
})

test('rows that cannot be read stop the import and are named', () => {
    const result = check(sheet(
        ['01/09/2026', 'Deposit', 'CR1', 1000, '', 1000],
        ['sometime', 'Deposit', 'CR2', 500, '', 1500],
        ['03/09/2026', 'Deposit', 'CR3', 'five hundred', '', 2000],
        ['04/09/2026', 'Deposit', 'CR4', 500, '', 2500],
        ['05/09/2026', 'Deposit', 'CR5', 500, '', 3000],
    ))
    expect(result.ok).toBe(false)
    expect(result.errors.map((finding) => [finding.title, finding.rows])).toEqual([
        ['1 row has no readable date', [6]],
        ['1 row has an amount that is not a number', [7]],
    ])
    expect(result.errors[0].detail).toMatch(/row 6 has a date that cannot be read \("sometime"\)/)
})

test('a wrongly chosen column is called out as the column, not row by row', () => {
    const rows = sheet(['01/09/2026', 'Deposit', 'CR1', 1000, '', 1000], ['02/09/2026', 'Deposit', 'CR2', 500, '', 1500], ['03/09/2026', 'Deposit', 'CR3', 500, '', 2000], ['04/09/2026', 'Deposit', 'CR4', 500, '', 2500])
    expect(titles(check(rows, { mapping: { date: 1 } }).errors)).toEqual(['The date column does not look like dates'])
    expect(titles(check(rows, { mapping: { moneyIn: 1, moneyOut: -1 } }).errors)).toEqual(['The amount columns do not look like numbers'])
    expect(titles(check(rows, { mapping: { date: -1 } }).errors)).toContain('No date column')
    expect(titles(check(rows, { mapping: { moneyIn: -1, moneyOut: -1, amount: -1 } }).errors)).toContain('No amount column')
    expect(titles(check(rows, { bankAccountNo: '' }).errors)).toEqual(['No bank account chosen'])
})

test('things worth a look are warned about without stopping the import', () => {
    const result = check(sheet(
        ['01/09/2026', 'Deposit', 'CR1', 1000, '', 1000],
        ['02/09/2026', 'SMS fee', '', '', 50, 950],
        ['02/09/2026', 'SMS fee', '', '', 50, 900],
        // A line is missing before this one: the balance jumps.
        ['03/09/2026', 'Deposit', 'CR9', 100, '', 1500],
        ['04/09/2026', 'Mixed', '', 10, 5, 1505],
        ['05/11/2026', 'Deposit', 'CR10', 20, '', 1525],
        ['06/09/2026', 'Balance check', '', '', '', 1525],
    ))
    expect(result.ok).toBe(true)
    expect(result.warnings.map((finding) => [finding.title, finding.rows])).toEqual([
        ['1 row has a date and no amount', [11]],
        ['1 line is dated in the future', [10]],
        ['1 row has both money in and money out', [9]],
        ['2 lines appear more than once', [6, 7]],
        ['The balance does not follow on at 1 row', [8]],
    ])
})

test('a statement listed newest first still has its balances checked', () => {
    const result = check(sheet(
        ['03/09/2026', 'Charges', '', '', 50, 1450],
        ['02/09/2026', 'Deposit', 'CR2', 500, '', 1500],
        ['01/09/2026', 'Deposit', 'CR1', 1000, '', 1000],
    ))
    expect(result.warnings).toEqual([])
    expect(result.passed.find((finding) => finding.title === 'Balances follow on').detail).toMatch(/ending at 1,450\.00/)
})

test('one signed amount column works, and all-positive amounts are questioned', () => {
    const rows = [['Value Date', 'Narration', 'Amount'], ['01/09/2026', 'A', 100], ['02/09/2026', 'B', 200], ['03/09/2026', 'C', 300], ['04/09/2026', 'D', 400], ['05/09/2026', 'E', 500]]
    const result = check(rows)
    expect(result.ok).toBe(true)
    expect(titles(result.warnings)).toEqual(['Every amount is positive', 'No reference column'])
    const signed = check([['Value Date', 'Narration', 'Amount'], ['01/09/2026', 'A', 100], ['02/09/2026', 'B', '(200.00)']])
    expect(signed.lines.map((line) => line.amount)).toEqual([100, -200])
})

test('an empty file, or one with nothing under the headings, is refused', () => {
    expect(check([HEADERS]).ok).toBe(false)
    expect(titles(check([HEADERS]).errors)).toEqual(['No statement lines found'])
})
