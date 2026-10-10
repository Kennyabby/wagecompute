// jsPDF needs these, and the test browser does not have them.
import { TextDecoder, TextEncoder } from 'util'

global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// The file is not downloaded in a test. The document is kept instead, so the
// test can look at what was drawn.
jest.mock('jspdf', () => {
    const actual = jest.requireActual('jspdf')
    return {
        ...actual,
        jsPDF: function mockDocument(...args) {
            const doc = new actual.jsPDF(...args)
            doc.save = () => { global.savedPdf = doc; return doc }
            return doc
        },
    }
})

jest.mock('xlsx', () => ({ ...jest.requireActual('xlsx'), writeFile: (workbook) => { global.savedBook = workbook } }))

const fs = require('fs')
const XLSX = require('xlsx')
const { generatePDF, generateExcel } = require('./exportUtils')

const company = { name: 'Demo Company', address: 'Demo company address', phone: '', email: 'info@example.com', logoUrl: null }

afterEach(() => { global.savedPdf = null; jest.restoreAllMocks() })

// Every piece of text drawn, page by page, with where it was put.
const drawn = (doc) => {
    const pages = []
    for (let page = 1; page <= doc.internal.getNumberOfPages(); page += 1) pages.push(doc.internal.pages[page].join('\n'))
    return pages
}
const keepCopy = (doc, name) => { if (process.env.PDF_COPY_DIR) fs.writeFileSync(`${process.env.PDF_COPY_DIR}/${name}`, Buffer.from(doc.output('arraybuffer'))) }

const items = ['150CL JAZMYNE BOTTLED WATER', '50CL Jazmyne Bottled Water', '50CL JAZMYNE BOTTLED WATER', '75CL Jazmyne Bottled Water', '75CL JAZMYNE BOTTLED WATER']
const pivotColumns = [
    { name: 'Customers', reference: 'r0' },
    ...items.flatMap((item, index) => [{ name: `${item}: Quantity (PACKS)`, reference: `x${index}_q`, numeric: true }, { name: `${item}: Sales Amount`, reference: `x${index}_s`, numeric: true }]),
    { name: 'Total: Quantity (PACKS)', reference: 'q', numeric: true },
    { name: 'Total: Sales Amount', reference: 's', numeric: true },
]
const customers = ['FM INTEGRATED AND ALLIED VENTURE', 'EMEY J ENTERPRISES', 'ACCESS VILLA  LINK VENTURE', 'PILGRIM $ MIDAS EMPERIUMS', 'A CUSTOMER WHOSE REGISTERED NAME IS VERY LONG INDEED AND KEEPS GOING LIMITED']
const pivotRows = customers.map((name, at) => {
    const row = { r0: name, q: 0, s: 0 }
    items.forEach((item, index) => { const quantity = (at + 1) * (index + 2) * 175; row[`x${index}_q`] = quantity; row[`x${index}_s`] = quantity * 1357.5; row.q += quantity; row.s += quantity * 1357.5 })
    return row
})

test('a wide report keeps every column apart, wraps long headings and prints figures with separators', async () => {
    await generatePDF(pivotRows, pivotColumns, company, { startDate: '2026-10-01', endDate: '2026-10-10' }, 'Item Sales Customer Wise (Business Central)', { Location: 'WH, WH-TM' }, { totalsRow: true })
    const saved = global.savedPdf
    keepCopy(saved, 'wide.pdf')
    const table = saved.lastAutoTable
    const page = saved.internal.pageSize.width

    // Every column is there, none narrower than a readable least, and the
    // columns printed on one page never add up to more than the page.
    expect(table.columns).toHaveLength(pivotColumns.length)
    table.columns.forEach((column) => expect(column.width).toBeGreaterThanOrEqual(13.9))
    expect(table.columns.reduce((sum, column) => sum + column.width, 0)).toBeLessThanOrEqual(page - 19.9)

    // A heading too long for its column is on several lines of its own cell.
    const heading = table.head[0].cells[1]
    expect(heading.text.length).toBeGreaterThan(1)
    heading.text.forEach((line) => expect(saved.getTextWidth(line)).toBeLessThanOrEqual(table.columns[1].width))
    // So is a long name, and its row is tall enough to hold every line.
    const longName = table.body[4].cells[0]
    expect(longName.text.length).toBeGreaterThan(1)
    expect(table.body[4].height).toBeGreaterThan(table.body[1].height)

    const text = drawn(saved).join('\n')
    expect(text).toContain('(PACKS\\))')
    // A column of whole numbers has no decimals. One with any has two on every line.
    expect(text).toContain('(475,125)')
    expect(text).toContain('(712,687.50)')
    expect(text).toContain('(1,425,375.00)')
    expect(text).not.toContain('475125')
})

test('a report with more columns than a page can hold carries on across pages, with the first column repeated', async () => {
    const columns = [{ name: 'Customer', reference: 'name' }, ...Array.from({ length: 40 }, (unused, index) => ({ name: `Heading number ${index + 1} of the report`, reference: `c${index}`, numeric: true }))]
    const rows = Array.from({ length: 3 }, (unused, at) => ({ name: `Customer ${at + 1}`, ...Object.fromEntries(columns.slice(1).map((column, index) => [column.reference, (at + 1) * (index + 1) * 1234567.89])) }))
    await generatePDF(rows, columns, company, null, 'Forty columns', {})
    const saved = global.savedPdf
    keepCopy(saved, 'forty.pdf')
    const pages = drawn(saved)
    expect(pages.length).toBeGreaterThan(1)
    const text = pages.join('\n')
    // Every heading is printed somewhere. Its number is on a line of its own
    // or shared, so the number alone is looked for.
    columns.slice(1).forEach((column, index) => expect(text).toMatch(new RegExp(`number ${index + 1}\\b`)))
    // The first column comes back on each page the table spreads over.
    pages.forEach((page) => expect(page).toContain('(Customer 1)'))
    expect(text).toContain('1,234,567.89')
})

test('a spreadsheet shows figures with separators and keeps them as numbers', () => {
    generateExcel(
        [{ name: 'KINGS FRUIT', qty: 27360, sales: 3573000.5 }, { name: 'Total', qty: 27360, sales: 3573000.5 }],
        [{ name: 'Customer', reference: 'name' }, { name: 'Quantity', reference: 'qty', numeric: true }, { name: 'Sales', reference: 'sales', numeric: true }],
        company, null, 'Sales', {}, false, { skipAutoTotals: true },
    )
    const sheet = global.savedBook.Sheets.Sales
    const cells = Object.values(sheet).filter((cell) => cell && cell.t === 'n')
    expect(cells.map((cell) => [cell.v, cell.z])).toEqual([[27360, '#,##0'], [3573000.5, '#,##0.00'], [27360, '#,##0'], [3573000.5, '#,##0.00']])
    // The caller's own totals line is the only one: no second line adding it in.
    expect(Object.values(sheet).some((cell) => cell && cell.v === 'TOTAL')).toBe(false)
    expect(XLSX.utils.format_cell(cells[1])).toBe('3,573,000.50')
})
