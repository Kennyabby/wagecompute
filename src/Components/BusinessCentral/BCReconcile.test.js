import { fireEvent, render, screen } from '@testing-library/react'
import BCReconcile, { cellsForServer, findingRows, headlineFigure, transactionRows } from './BCReconcile'

jest.mock('../../utils/exportUtils', () => ({ generatePDF: jest.fn(), generateExcel: jest.fn() }))
// Plain functions, not jest.fn: the test setup resets mock implementations
// between tests, which would leave the second import with no workbook.
// The workbook the next import reads; a test can swap in a file of its own.
const mockTemplate = {
    SheetNames: ['How to fill this in', 'Your figures', 'BC figures', 'About'],
    Sheets: {
        'Your figures': { rows: [['Item No.', 'Location code', 'Closing qty (counted)'], ['A', 'WH', 72]] },
        'BC figures': { rows: [['never sent']] },
        About: { rows: [['Kind', 'stock'], ['From', new Date(2026, 8, 1)]] },
    },
}
let mockWorkbook = mockTemplate
jest.mock('xlsx', () => ({
    read: () => mockWorkbook,
    utils: { sheet_to_json: (sheet) => sheet?.rows || [], book_new: () => ({}), aoa_to_sheet: () => ({}), book_append_sheet: () => {} },
    writeFile: () => {},
}))

const resolution = (action, headline, options) => ({ action, headline, options, lastResort: action === 'adjust' })
const step = (title, page, extra = {}) => ({ title, page: page ? { name: page, no: 40, label: `${page} (page 40)` } : null, steps: [`Do ${title}`], accounts: [], lastResort: false, ...extra })

const result = {
    kind: 'stock',
    title: 'Stock count and movements',
    params: { from: '2026-09-01', to: '2026-09-30' },
    periodFrom: 'template',
    measure: 'qty',
    lineColumns: [{ key: 'itemNo', label: 'Item No.' }, { key: 'locationCode', label: 'Location code' }],
    figureColumns: [{ key: 'openingQty', label: 'Opening qty', measure: 'qty' }, { key: 'closingQty', label: 'Closing qty (counted)', measure: 'qty' }, { key: 'closingValue', label: 'Closing value', measure: 'money' }],
    notes: [],
    lines: [
        { key: 'A|WH', cells: { itemNo: 'A', locationCode: 'WH' }, status: 'Difference', unexplained: -3, findings: ['F1', 'F2'], figures: [{ key: 'closingQty', label: 'Closing qty (counted)', measure: 'qty', erp: 85, sheet: 72, difference: -13 }] },
        { key: 'B|WH', cells: { itemNo: 'B', locationCode: 'WH' }, status: 'Agrees', unexplained: 0, findings: [], figures: [{ key: 'closingQty', label: 'Closing qty (counted)', measure: 'qty', erp: 10, sheet: 10, difference: 0 }] },
    ],
    findings: [
        { id: 'F1', lineKey: 'A|WH', type: 'missingInErp', effect: -3, measure: 'qty', date: '2026-09-20', documentNo: 'DMG2', detail: 'Your sheet has 3 of A as damage.', sheetTransaction: { date: '2026-09-20', documentNo: 'DMG2', type: 'Damage', quantity: -3, sheetRows: [5] }, resolution: resolution('post', 'Post it in Business Central.', [step('Post the stock lost', 'Item Journal')]) },
        { id: 'F2', lineKey: 'A|WH', type: 'unexplained', effect: -3, measure: 'qty', detail: '3 is not explained.', candidates: [{ date: '2026-09-05', documentNo: 'SS1', type: 'Sale', effect: -30, entryNos: [2] }, { date: '2026-09-10', documentNo: 'PR1', type: 'Purchase', effect: 20, entryNos: [3] }], resolution: resolution('adjust', 'Recount first.', [step('Check before adjusting'), step('Last resort: correct the count', 'Phys. Inventory Journal', { lastResort: true })]) },
    ],
    transactions: [
        { status: 'Matched', rule: 'Document number', sheet: { date: '2026-09-05', documentNo: 'SS1', type: 'Sale', itemNo: 'A', locationCode: 'WH', quantity: -30, sheetRows: [2] }, erp: { date: '2026-09-05', documentNo: 'SS1', type: 'Sale', itemNo: 'A', locationCode: 'WH', quantity: -30, entryNos: [2] } },
        { status: 'Only on your sheet', rule: '', findingId: 'F1', sheet: { date: '2026-09-20', documentNo: 'DMG2', type: 'Damage', itemNo: 'A', locationCode: 'WH', quantity: -3, sheetRows: [5] }, erp: null },
    ],
    summary: { lines: 2, agree: 1, differ: 1, notOnSheet: 0, notInBc: 0, sheetTransactions: 2, matched: 1, onlyOnSheet: 1, onlyInBc: 0, findings: 2, byAction: { post: 1, adjust: 1 }, lastResort: 1 },
}

const definition = { key: 'stock', reconcile: { kind: 'stock', title: 'Stock count and movements' } }
const report = { params: { from: '2026-09-01', to: '2026-09-30', groupBy: 'itemLocation' }, rows: [] }

test('dates read from a sheet go to the server as the day the sheet shows', () => {
    expect(cellsForServer([[new Date(2026, 8, 30), 'x', 5]])).toEqual([['2026-09-30', 'x', 5]])
})

test('a line is judged by its closing figure, or by its amount on a register', () => {
    expect(headlineFigure(result).key).toBe('closingQty')
    expect(headlineFigure({ measure: 'money', figureColumns: [{ key: 'quantity', measure: 'qty' }, { key: 'amount', measure: 'money' }] }).key).toBe('amount')
})

test('the export carries each finding with its first fix and marks the last resort', () => {
    const rows = findingRows(result)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ line: 'A WH', action: 'Post in Business Central', page: 'Item Journal (page 40)', lastResort: '' })
    expect(rows[1]).toMatchObject({ action: 'Adjust (last resort)', lastResort: 'Yes' })
    expect(rows[1].otherWays).toContain('Last resort: correct the count')
})

test('transactions are flattened with both sides and their difference', () => {
    const rows = transactionRows(result)
    expect(rows[0]).toMatchObject({ status: 'Matched', sheetAmount: -30, erpAmount: -30, difference: 0, entryNos: '2' })
    expect(rows[1]).toMatchObject({ status: 'Only on your sheet', erpAmount: '', difference: -3, sheetRow: '5' })
})

// The columns the stock reconciliation reads, as the server lists them.
const COLUMNS = {
    figures: [
        { key: 'itemNo', label: 'Item No.', type: 'text', required: true, aliases: ['Item'] },
        { key: 'locationCode', label: 'Location code', type: 'text', required: true, aliases: ['Location', 'Store'] },
        { key: 'closingQty', label: 'Closing qty (counted)', type: 'number', required: false, aliases: ['Counted'] },
    ],
    transactions: [],
    types: null,
}
const importFile = async (api, workbook = mockTemplate) => {
    mockWorkbook = workbook
    api.reconcileColumns = api.reconcileColumns || jest.fn(() => Promise.resolve({ ok: true, columns: COLUMNS }))
    api.reconcileMappings = api.reconcileMappings || jest.fn(() => Promise.resolve({ ok: true, mappings: [] }))
    api.saveReconcileMapping = api.saveReconcileMapping || jest.fn(() => Promise.resolve({ ok: true }))
    render(<BCReconcile api={api} definition={definition} report={report} />)
    const file = new File(['x'], 'counts.xlsx')
    file.arrayBuffer = () => Promise.resolve(new ArrayBuffer(1))
    fireEvent.change(screen.getByLabelText('Import filled template'), { target: { files: [file] } })
}

test('an imported template is compared and the fixes are shown, adjustment last', async () => {
    const api = { reconcileRun: jest.fn(() => Promise.resolve({ ok: true, result })), reconcileTemplate: jest.fn() }
    await importFile(api)
    await screen.findByText(/Compared counts.xlsx/)
    // Only the sheets that are filled in go back, never the BC reference sheets.
    const sent = api.reconcileRun.mock.calls[0][2]
    expect(Object.keys(sent).sort()).toEqual(['About', 'Your figures'])
    expect(sent.About[1][1]).toBe('2026-09-01')

    // Lines that agree are hidden until asked for.
    expect(screen.queryByRole('cell', { name: 'B' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Show 2' }))
    expect(screen.getByText('Your sheet has 3 of A as damage.')).toBeInTheDocument()
    expect(screen.getByText('Last resort')).toBeInTheDocument()
    expect(screen.getByText(/Business Central entries behind this figure/)).toBeInTheDocument()

    // Filtering to what needs posting leaves the adjustment out.
    fireEvent.click(screen.getByRole('button', { name: 'What to do (2)' }))
    fireEvent.click(screen.getByRole('button', { name: 'Post in Business Central (1)' }))
    expect(screen.getByRole('button', { name: 'What to do (1)' })).toBeInTheDocument()
    expect(screen.queryByText('Recount first.')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Transactions/ }))
    expect(screen.getAllByText('Only on your sheet').length).toBeGreaterThan(0)
})

test('cells that cannot be read are listed and nothing is compared', async () => {
    const api = { reconcileRun: jest.fn(() => Promise.resolve({ ok: true, result: { ...result, problems: [{ sheet: 'Your figures', row: 4, message: '"Closing qty (counted)" is not a number: lots' }], problemCount: 1 } })), reconcileTemplate: jest.fn() }
    await importFile(api)
    await screen.findByText(/1 cell needs fixing/)
    expect(screen.getByText(/is not a number: lots/)).toBeInTheDocument()
    expect(screen.queryByText('Lines that agree')).not.toBeInTheDocument()
})

describe('the reconciliation download', () => {
    const { reconSheets, verdictOf } = jest.requireActual('./bcReconExport')
    const withFilters = { ...result, report: 'Stock Report', filters: [{ label: 'Location', value: 'WH' }] }
    const sheetOf = (sheets, name) => sheets.find((entry) => entry.name === name)

    test('carries the verdict, the filters, every line, finding, step, transaction and BC entry', () => {
        const sheets = reconSheets(withFilters, { fileName: 'counts.xlsx' })
        expect(sheets.map((entry) => entry.name)).toEqual(['Summary', 'Lines', 'Findings', 'Steps', 'Transactions', 'BC entries'])
        const summary = sheetOf(sheets, 'Summary').rows
        expect(summary).toContainEqual(['Result', verdictOf(withFilters)])
        expect(summary).toContainEqual(['Location', 'WH'])
        expect(summary).toContainEqual(['Compared with', 'counts.xlsx'])
        // Agreeing lines are kept too: the file is a full record.
        expect(sheetOf(sheets, 'Lines').rows).toHaveLength(3)
        const steps = sheetOf(sheets, 'Steps').rows
        expect(steps.filter((row) => row[0] === 'F2').map((row) => row[3])).toEqual(['Check before adjusting', 'Last resort: correct the count'])
        expect(steps.find((row) => row[3] === 'Last resort: correct the count')[5]).toBe('Yes')
        expect(sheetOf(sheets, 'BC entries').rows.slice(1).map((row) => row[6])).toEqual(['Out', 'In'])
    })

    test('says so when everything agrees, and still gives the lines', () => {
        const agreed = { ...withFilters, findings: [], lines: [result.lines[1]], summary: { ...result.summary, differ: 0, findings: 0, byAction: {}, lastResort: 0, agree: 1 } }
        expect(verdictOf(agreed)).toMatch(/^Everything compared agrees/)
        expect(sheetOf(reconSheets(agreed), 'Lines').rows).toHaveLength(2)
    })

    test('a file with problems gives the summary and the problems only', () => {
        const broken = { ...withFilters, problems: [{ sheet: 'Your figures', row: 4, message: 'not a number' }], problemCount: 1 }
        const sheets = reconSheets(broken)
        expect(sheets.map((entry) => entry.name)).toEqual(['Summary', 'Problems'])
        expect(verdictOf(broken)).toMatch(/Nothing was compared/)
    })
})

test('the report the panel sits on goes to the server with the file', async () => {
    const api = { reconcileRun: jest.fn(() => Promise.resolve({ ok: true, result: { ...result, findings: [], summary: { ...result.summary, findings: 0, differ: 0, byAction: {} } } })), reconcileTemplate: jest.fn() }
    await importFile(api)
    await screen.findByText(/Everything compared agrees/)
    expect(api.reconcileRun.mock.calls[0][3]).toBe('stock')
    expect(screen.getByRole('button', { name: 'Download the reconciliation (Excel)' })).toBeEnabled()
})

test('the PDF is built with every finding and saved under the period', async () => {
    // Browsers have this; the test page does not.
    if (!global.TextEncoder) global.TextEncoder = jest.requireActual('util').TextEncoder
    if (!global.TextDecoder) global.TextDecoder = jest.requireActual('util').TextDecoder
    const { buildReconPdf, reconFileName } = jest.requireActual('./bcReconExport')
    const input = { ...result, report: 'Stock Report', filters: [{ label: 'Location', value: 'WH' }] }
    const pdf = await buildReconPdf(input, { fileName: 'counts.xlsx' })
    expect(reconFileName(input, 'pdf')).toBe('stock-reconciliation-2026-09-01-to-2026-09-30.pdf')
    // The findings start on a page of their own.
    expect(pdf.getNumberOfPages()).toBeGreaterThanOrEqual(2)
})

describe('a file of the person\'s own', () => {
    // A stock count kept the person's way: a title row, headings of their
    // own, a column BC does not need, and one count that is not a number.
    const ownFile = (counted = 'lots') => ({
        SheetNames: ['Count sheet'],
        Sheets: { 'Count sheet': { rows: [['September count'], ['Code', 'Store', 'Counted', 'Counted by'], ['A', 'WH', 72, 'Ada'], ['B', 'WH', counted, 'Ada']] } },
    })

    test('opens the mapping, checks every cell, and stops on a value that is not a number', async () => {
        const api = { reconcileRun: jest.fn(), reconcileTemplate: jest.fn() }
        await importFile(api, ownFile())
        await screen.findByText(/Match the columns of counts.xlsx/)
        // Headings found below the title, and columns matched by their words.
        expect(screen.getByLabelText('Heading row for Your figures')).toHaveValue(2)
        expect(screen.getByLabelText('Your column for Location code')).toHaveDisplayValue('Store')
        expect(screen.getByLabelText('Your column for Closing qty (counted)')).toHaveDisplayValue('Counted')
        // "Code" is not a word Item No. goes by, so the person picks it.
        expect(screen.getByText(/"Item No\." must be filled before comparing/)).toBeInTheDocument()
        fireEvent.change(screen.getByLabelText('Your column for Item No.'), { target: { value: '0' } })
        expect(screen.getByText(/needs numbers\. Row 4 has "lots"/)).toBeInTheDocument()
        expect(screen.getByText(/Not used: "Counted by"/)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Compare' })).toBeDisabled()
        expect(api.reconcileRun).not.toHaveBeenCalled()
    })

    test('a file that passes is compared, laid out like the template, and its mapping is kept', async () => {
        const api = { reconcileRun: jest.fn(() => Promise.resolve({ ok: true, result })), reconcileTemplate: jest.fn() }
        await importFile(api, ownFile(10))
        await screen.findByText(/Match the columns of counts.xlsx/)
        fireEvent.change(screen.getByLabelText('Your column for Item No.'), { target: { value: '0' } })
        fireEvent.click(screen.getByRole('button', { name: 'Compare' }))
        await screen.findByText(/The mapping is saved/)
        expect(api.reconcileRun.mock.calls[0][2]).toEqual({ 'Your figures': [['Item No.', 'Location code', 'Closing qty (counted)'], ['A', 'WH', 72], ['B', 'WH', 10]] })
        const kept = api.saveReconcileMapping.mock.calls[0][0]
        expect(kept).toMatchObject({ kind: 'stock', reportKey: 'stock', parts: { figures: { sheetName: 'Count sheet', headerAt: 1, mapping: { itemNo: 'Code', locationCode: 'Store', closingQty: 'Counted' } } } })
    })

    test('the next file with the same headings, in another order, needs no mapping', async () => {
        const saved = { id: 'c1|stock|stock|x', usedAt: Date.now(), parts: { figures: { sheetName: 'Count sheet', headerAt: 1, header: ['Code', 'Store', 'Counted', 'Counted by'], mapping: { itemNo: 'Code', locationCode: 'Store', closingQty: 'Counted' } } } }
        const api = { reconcileRun: jest.fn(() => Promise.resolve({ ok: true, result })), reconcileTemplate: jest.fn(), reconcileMappings: jest.fn(() => Promise.resolve({ ok: true, mappings: [saved] })) }
        const reordered = { SheetNames: ['October'], Sheets: { October: { rows: [['Counted by', 'Counted', 'Store', 'Code'], ['Ada', 50, 'WH', 'A']] } } }
        await importFile(api, reordered)
        await screen.findByText(/with the mapping saved for this layout/)
        expect(screen.queryByText(/Match the columns/)).not.toBeInTheDocument()
        expect(api.reconcileRun.mock.calls[0][2]).toEqual({ 'Your figures': [['Item No.', 'Location code', 'Closing qty (counted)'], ['A', 'WH', 50]] })
        expect(screen.getByRole('button', { name: 'Change the mapping' })).toBeInTheDocument()
    })
})
