import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import BCBuilder, { GUIDE } from './BCBuilder'
import BCBankStatement from './BCBankStatement'
import ContextProvider from '../../Resources/ContextProvider'

jest.mock('../../utils/exportUtils', () => ({ generatePDF: jest.fn(), generateExcel: jest.fn() }))

// The spreadsheet library, reduced to what the statement page asks of it.
// `mockSheetRows` is what the next file "contains".
let mockSheetRows = []
jest.mock('xlsx', () => ({
    read: () => ({ SheetNames: ['Sheet1'], Sheets: { Sheet1: {} } }),
    utils: { sheet_to_json: () => mockSheetRows, book_new: () => ({}), aoa_to_sheet: () => ({}), book_append_sheet: () => {} },
    writeFile: jest.fn(),
}))

const schema = {
    tables: [
        { service: 'Customers', label: 'Customers', fields: [{ name: 'No', label: 'No', type: 'text' }, { name: 'Name', label: 'Name', type: 'text' }] },
        { service: 'ValueEntries', label: 'Value Entries', fields: [
            { name: 'Posting_Date', label: 'Posting Date', type: 'date' },
            { name: 'Source_No', label: 'Source No', type: 'text' },
            { name: 'Sales_Amount_Actual', label: 'Sales Amount Actual', type: 'number' },
            { name: 'Cost_Amount_Actual', label: 'Cost Amount Actual', type: 'number' },
        ] },
    ],
    aggregates: { sum: 'Sum', avg: 'Average', min: 'Smallest', max: 'Largest', count: 'Count of rows', distinct: 'Count of different values' },
    periods: { day: 'Day', month: 'Month', quarter: 'Quarter', year: 'Year' },
    operators: { eq: 'is', ne: 'is not', contains: 'contains', blank: 'is blank' },
    charts: ['none', 'bar', 'horizontalBar', 'line'],
    limits: { rows: 3, measures: 8, formulas: 6, filters: 10, tiles: 6 },
}
const preview = {
    kpis: [{ key: 't0', label: 'Sales', value: 475000, format: 'money' }],
    charts: [],
    columns: [{ key: 'r0', label: 'Source No', type: 'text' }, { key: 'm0', label: 'Sales', type: 'money', total: true }, { key: 'f0', label: 'Profit', type: 'money' }],
    rows: [{ r0: 'C002', m0: 250000, f0: 150000 }, { r0: 'C001', m0: 225000, f0: 135000 }],
    totals: { m0: 475000 },
    meta: { note: '', rowsRead: 3, table: 'Value Entries' },
}

test('a report is built step by step, previewed and saved', async () => {
    const api = {
        getBuilderSchema: jest.fn().mockResolvedValue({ schema }),
        runBuilder: jest.fn().mockResolvedValue({ report: preview }),
        saveReport: jest.fn().mockResolvedValue({ report: { id: 'r1', name: 'Profit by customer' } }),
    }
    const onSaved = jest.fn()
    const notify = jest.fn()
    render(<BCBuilder api={api} onSaved={onSaved} onClose={() => {}} notify={notify} />)

    // The guide is open for a new report and covers every step.
    expect(await screen.findByRole('heading', { name: 'How to build a report' })).toBeInTheDocument()
    expect(GUIDE).toHaveLength(14)
    expect(screen.getByText(/A formula works on the figures by their letters/)).toBeInTheDocument()

    fireEvent.change(await screen.findByPlaceholderText('For example: Profit by customer'), { target: { value: 'Profit by customer' } })
    fireEvent.change(screen.getByLabelText('Business Central page'), { target: { value: 'ValueEntries' } })
    fireEvent.change(screen.getByLabelText('Period field'), { target: { value: 'Posting_Date' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add a row grouping' }))
    fireEvent.change(screen.getByLabelText('Row 1'), { target: { value: 'Source_No' } })
    // Figure A starts as a count. Make it the sum of sales, then add cost as B.
    fireEvent.change(screen.getByLabelText('Figure A works out'), { target: { value: 'sum' } })
    // Only number fields are offered for a sum.
    expect([...screen.getByLabelText('Figure A field').options].map((option) => option.value)).toEqual(['', 'Sales_Amount_Actual', 'Cost_Amount_Actual'])
    fireEvent.change(screen.getByLabelText('Figure A field'), { target: { value: 'Sales_Amount_Actual' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add a figure' }))
    fireEvent.change(screen.getByLabelText('Figure B field'), { target: { value: 'Cost_Amount_Actual' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add a formula' }))
    fireEvent.change(screen.getByLabelText('Formula 1 heading'), { target: { value: 'Profit' } })
    fireEvent.change(screen.getByLabelText('Formula 1'), { target: { value: '=A+B' } })
    fireEvent.change(screen.getByLabelText('Chart type'), { target: { value: 'bar' } })

    fireEvent.click(screen.getByRole('button', { name: 'Preview' }))
    await waitFor(() => expect(api.runBuilder).toHaveBeenCalled())
    const [spec, params] = api.runBuilder.mock.calls[0]
    expect(spec).toMatchObject({
        name: 'Profit by customer',
        service: 'ValueEntries',
        dateField: 'Posting_Date',
        rows: [{ field: 'Source_No' }],
        measures: [{ field: 'Sales_Amount_Actual', aggregate: 'sum' }, { field: 'Cost_Amount_Actual', aggregate: 'sum' }],
        formulas: [{ label: 'Profit', expression: '=A+B' }],
        chart: { type: 'bar' },
    })
    expect(params).toEqual({ from: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), to: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) })
    expect(await screen.findByRole('cell', { name: 'C002' })).toBeInTheDocument()
    expect(screen.getByText('3 rows read from Value Entries.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Save report' }))
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith({ id: 'r1', name: 'Profit by customer' }))
    expect(api.saveReport.mock.calls[0][1]).toBeUndefined()
    expect(notify).toHaveBeenCalledWith('success', expect.stringMatching(/saved/))
})

test('what the server says is wrong with a report is shown, and a report cannot be saved without a name', async () => {
    const api = {
        getBuilderSchema: jest.fn().mockResolvedValue({ schema }),
        runBuilder: jest.fn().mockRejectedValue(new Error('The formula "=A+Z" uses Z, but the report only has figures up to A.')),
    }
    render(<BCBuilder api={api} onSaved={() => {}} onClose={() => {}} notify={() => {}} />)
    fireEvent.change(await screen.findByLabelText('Business Central page'), { target: { value: 'Customers' } })
    // A page with no dates cannot have a period.
    expect(screen.getByLabelText('Period field').options[0].textContent).toBe('This page has no dates')
    expect(screen.getByRole('button', { name: 'Save report' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }))
    expect(await screen.findByText(/uses Z, but the report only has figures up to A/)).toBeInTheDocument()
})

test('an existing report opens with its settings and saves under its id', async () => {
    const saved = { id: 'r9', name: 'Customers', spec: { name: 'Customers', service: 'Customers', rows: [{ field: 'Name' }], measures: [{ field: '', aggregate: 'count', label: 'How many' }], formulas: [], filters: [], tiles: [], chart: { type: 'none', outputs: [0] }, sort: { output: 0, descending: true }, limit: 50, pinned: true } }
    const api = { getBuilderSchema: jest.fn().mockResolvedValue({ schema }), saveReport: jest.fn().mockResolvedValue({ report: { id: 'r9', name: 'Customers' } }) }
    render(<BCBuilder api={api} saved={saved} onSaved={() => {}} onClose={() => {}} notify={() => {}} />)
    expect(await screen.findByLabelText('Row 1')).toHaveValue('Name')
    expect(screen.getByLabelText('Figure A heading')).toHaveValue('How many')
    expect(screen.getByLabelText(/Show this report's tiles and chart on the dashboard/)).toBeChecked()
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(api.saveReport).toHaveBeenCalledWith(expect.objectContaining({ name: 'Customers', limit: 50 }), 'r9'))
})

test('pages are combined: a link brings in a name, another page is matched to the rows, and a figure reads from it', async () => {
    const wide = { ...schema, tables: [...schema.tables, { service: 'CustLedgerEntries', label: 'Cust Ledger Entries', fields: [{ name: 'Posting_Date', label: 'Posting Date', type: 'date' }, { name: 'Customer_No', label: 'Customer No', type: 'text' }, { name: 'Amount_LCY', label: 'Amount LCY', type: 'number' }] }] }
    const api = { getBuilderSchema: jest.fn().mockResolvedValue({ schema: wide }), runBuilder: jest.fn().mockResolvedValue({ report: { ...preview, meta: { note: '', rowsRead: 9, table: 'Value Entries + Cust Ledger Entries' } } }) }
    render(<BCBuilder api={api} onSaved={() => {}} onClose={() => {}} notify={() => {}} />)
    fireEvent.change(await screen.findByLabelText('Business Central page'), { target: { value: 'ValueEntries' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add a row grouping' }))
    fireEvent.change(screen.getByLabelText('Row 1'), { target: { value: 'Source_No' } })

    // A lookup: customer number in, customer name out.
    fireEvent.click(screen.getByRole('button', { name: 'Add a link' }))
    fireEvent.change(screen.getByLabelText('Link 1 from field'), { target: { value: 'Source_No' } })
    fireEvent.change(screen.getByLabelText('Link 1 looks up'), { target: { value: 'Customers' } })
    fireEvent.change(screen.getByLabelText('Link 1 matching field'), { target: { value: 'No' } })
    fireEvent.change(screen.getByLabelText('Link 1 bring in'), { target: { value: 'Name' } })
    // The linked field is now offered as a row, under the linked page's name.
    fireEvent.click(screen.getByRole('button', { name: 'Add a row grouping' }))
    expect([...screen.getByLabelText('Row 2').options].map((option) => option.textContent)).toContain('Customers: Name')
    fireEvent.change(screen.getByLabelText('Row 2'), { target: { value: 'L1.Name' } })
    // While a row uses it, the link cannot be removed from under it.
    expect(screen.getAllByRole('button', { name: 'Remove' })[0]).toBeDisabled()

    // A second page, matched to the first row. The name row follows its link.
    fireEvent.click(screen.getByRole('button', { name: 'Add a page' }))
    fireEvent.change(screen.getByLabelText('Page 2'), { target: { value: 'CustLedgerEntries' } })
    fireEvent.change(screen.getByLabelText('Page 2 period field'), { target: { value: 'Posting_Date' } })
    fireEvent.change(screen.getByLabelText('Page 2 match for row 1'), { target: { value: 'Customer_No' } })
    expect(screen.getByLabelText('Page 2 match for row 2').options[0].textContent).toBe('Follows from its link')

    fireEvent.change(screen.getByLabelText('Figure A works out'), { target: { value: 'sum' } })
    fireEvent.change(screen.getByLabelText('Figure A field'), { target: { value: 'Sales_Amount_Actual' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add a figure' }))
    fireEvent.change(screen.getByLabelText('Figure B page'), { target: { value: '1' } })
    // Figure B is offered the second page's numbers, not the first page's.
    expect([...screen.getByLabelText('Figure B field').options].map((option) => option.value)).toEqual(['', 'Amount_LCY'])
    fireEvent.change(screen.getByLabelText('Figure B field'), { target: { value: 'Amount_LCY' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add a formula' }))
    fireEvent.change(screen.getByLabelText('Formula 1'), { target: { value: '=A-B' } })

    // The layout strip shows the columns the way a sheet would.
    const layout = screen.getByRole('table', { name: 'Layout of the report' })
    expect(within(layout).getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual(['', '', 'A', 'B', 'fx'])
    expect(layout).toHaveTextContent('Page 2: Cust Ledger Entries')

    // The second page has a period even though the first has none, so the preview asks for one.
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }))
    await waitFor(() => expect(api.runBuilder).toHaveBeenCalled())
    const [spec, params] = api.runBuilder.mock.calls[0]
    expect(spec).toMatchObject({
        service: 'ValueEntries',
        rows: [{ field: 'Source_No' }, { field: 'L1.Name' }],
        links: [{ page: 0, from: 'Source_No', service: 'Customers', to: 'No', fields: ['Name'] }],
        pages: [{ service: 'CustLedgerEntries', dateField: 'Posting_Date', match: ['Customer_No', ''] }],
        measures: [{ page: 0, field: 'Sales_Amount_Actual' }, { page: 1, field: 'Amount_LCY' }],
        formulas: [{ expression: '=A-B' }],
        join: 'all',
    })
    expect(params).toEqual({ from: expect.any(String), to: expect.any(String) })
    expect(await screen.findByText('9 rows read from Value Entries + Cust Ledger Entries.')).toBeInTheDocument()
    // In the preview a figure's heading carries its letter.
    expect(screen.getByText('[A] Sales')).toBeInTheDocument()
})

test('an item-wise report: a calculated field, values picked for a filter, a reader filter, and changes made on the preview', async () => {
    const wide = { ...schema, aggregates: { ...schema.aggregates, first: 'Show the value' }, operators: { ...schema.operators, in: 'is one of', notin: 'is not one of' }, tables: [...schema.tables.map((entry) => (entry.service === 'ValueEntries' ? { ...entry, fields: [...entry.fields, { name: 'Item_No', label: 'Item No', type: 'text' }, { name: 'Location_Code', label: 'Location Code', type: 'text' }, { name: 'Invoiced_Quantity', label: 'Invoiced Quantity', type: 'number' }] } : entry))] }
    const pivot = {
        kpis: [], charts: [],
        columns: [{ key: 'r0', label: 'Source No', type: 'text' }, { key: 'x0_m0', label: 'FG-50CL: Qty', type: 'qty', total: true }, { key: 'x1_m0', label: 'FG-75CL: Qty', type: 'qty', total: true }, { key: 'm0', label: 'Total: Qty', type: 'qty', total: true }],
        rows: [{ r0: 'C001', x0_m0: 10, x1_m0: 5, m0: 15 }, { r0: 'C002', x0_m0: 2, x1_m0: 0, m0: 2 }],
        totals: { x0_m0: 12, x1_m0: 5, m0: 17 },
        meta: { note: '', rowsRead: 4, table: 'Value Entries', across: ['FG-50CL', 'FG-75CL'], prompts: [{ key: 'p0', label: 'Location', options: [{ value: 'DEPOT', label: 'DEPOT' }, { value: 'FACTORY', label: 'FACTORY' }] }] },
    }
    const api = {
        getBuilderSchema: jest.fn().mockResolvedValue({ schema: wide }),
        runBuilder: jest.fn().mockResolvedValue({ report: pivot }),
        getFieldValues: jest.fn().mockResolvedValue({ list: { values: ['FG-50CL', 'FG-75CL', 'RM-CAP'], cut: false } }),
        saveReport: jest.fn().mockResolvedValue({ report: { id: 'r5', name: 'Item wise' } }),
    }
    const notify = jest.fn()
    const onSaved = jest.fn()
    render(<BCBuilder api={api} onSaved={onSaved} onClose={() => {}} notify={notify} />)
    fireEvent.change(await screen.findByPlaceholderText('For example: Profit by customer'), { target: { value: 'Item wise' } })
    fireEvent.change(screen.getByLabelText('Business Central page'), { target: { value: 'ValueEntries' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add a row grouping' }))
    fireEvent.change(screen.getByLabelText('Row 1'), { target: { value: 'Source_No' } })
    fireEvent.change(screen.getByLabelText('Columns across'), { target: { value: 'Item_No' } })

    // A calculated field, with its field inserted from the list, then used in figure A.
    fireEvent.click(screen.getByRole('button', { name: 'Add a calculated field' }))
    fireEvent.change(screen.getByLabelText('Calculation 1 name'), { target: { value: 'Quantity sold' } })
    fireEvent.change(screen.getByLabelText('Calculation 1'), { target: { value: '=0-' } })
    fireEvent.change(screen.getByLabelText('Calculation 1 insert a field'), { target: { value: 'Invoiced_Quantity' } })
    expect(screen.getByLabelText('Calculation 1')).toHaveValue('=0-[Invoiced_Quantity]')
    fireEvent.change(screen.getByLabelText('Figure A works out'), { target: { value: 'sum' } })
    expect([...screen.getByLabelText('Figure A field').options].map((option) => option.textContent)).toContain('Quantity sold')
    fireEvent.change(screen.getByLabelText('Figure A field'), { target: { value: 'C1' } })
    fireEvent.change(screen.getByLabelText('Figure A heading'), { target: { value: 'Qty' } })

    // A filter whose values are ticked from what the field holds. Two ticks make it "is one of".
    fireEvent.click(screen.getByRole('button', { name: 'Add a filter' }))
    fireEvent.change(screen.getByLabelText('Filter 1 field'), { target: { value: 'Item_No' } })
    fireEvent.click(screen.getByRole('button', { name: 'Pick values' }))
    fireEvent.click(await screen.findByLabelText('FG-50CL'))
    fireEvent.click(screen.getByLabelText('FG-75CL'))
    expect(api.getFieldValues).toHaveBeenCalledWith({ service: 'ValueEntries', field: 'Item_No' })
    expect(screen.getByLabelText('Filter 1 value')).toHaveValue('FG-50CL, FG-75CL')
    expect(screen.getByLabelText('Filter 1 test')).toHaveValue('in')
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))

    // A filter the reader will see on the report.
    fireEvent.click(screen.getByRole('button', { name: 'Add a filter for the reader' }))
    fireEvent.change(screen.getByLabelText('Reader filter 1 field'), { target: { value: 'Location_Code' } })
    fireEvent.change(screen.getByLabelText('Reader filter 1 name'), { target: { value: 'Location' } })

    // Unfinished work can be kept as a draft, and later saves change that same one.
    fireEvent.click(screen.getByRole('button', { name: 'Save progress' }))
    await waitFor(() => expect(api.saveReport).toHaveBeenCalledWith(expect.objectContaining({ name: 'Item wise' }), undefined, true))
    expect(onSaved).not.toHaveBeenCalled()
    await waitFor(() => expect(notify).toHaveBeenCalledWith('success', expect.stringMatching(/saved as a draft/)))

    fireEvent.click(screen.getByRole('button', { name: 'Preview' }))
    await waitFor(() => expect(api.runBuilder).toHaveBeenCalledTimes(1))
    expect(api.runBuilder.mock.calls[0][0]).toMatchObject({
        calcs: [{ label: 'Quantity sold', expression: '=0-[Invoiced_Quantity]' }],
        across: { field: 'Item_No' },
        measures: [{ field: 'C1', aggregate: 'sum', label: 'Qty' }],
        filters: [{ field: 'Item_No', operator: 'in', value: 'FG-50CL, FG-75CL' }],
        prompts: [{ field: 'Location_Code', label: 'Location' }],
    })
    // The line's total is the last column and the bottom line totals each column.
    expect(await screen.findByText('[A] Total: Qty')).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: '17' })).toBeInTheDocument()

    // On the preview: the reader's filter narrows it.
    const reader = within(screen.getByRole('group', { name: 'Filters for the reader' }))
    fireEvent.click(reader.getByRole('button', { name: 'All' }))
    fireEvent.click(reader.getByLabelText('DEPOT'))
    await waitFor(() => expect(api.runBuilder).toHaveBeenCalledTimes(2))
    expect(api.runBuilder.mock.calls[1][1]).toEqual({ p0: ['DEPOT'] })

    // Leaving one item out writes the filter and runs again.
    fireEvent.click(await screen.findByRole('button', { name: 'Leave out FG-75CL' }))
    await waitFor(() => expect(api.runBuilder).toHaveBeenCalledTimes(3))
    expect(api.runBuilder.mock.calls[2][0].filters).toEqual([{ field: 'Item_No', operator: 'ne', value: 'FG-75CL' }])
    expect(screen.getByLabelText('Filter 1 value')).toHaveValue('FG-75CL')

    // Renaming a column there changes the figure's heading.
    const rename = await screen.findByLabelText('Rename column A')
    fireEvent.change(rename, { target: { value: 'Bottles' } })
    fireEvent.blur(rename)
    await waitFor(() => expect(api.runBuilder).toHaveBeenCalledTimes(4))
    expect(screen.getByLabelText('Figure A heading')).toHaveValue('Bottles')

    // Clicking a customer offers to show only that one.
    fireEvent.click(await screen.findByRole('button', { name: 'C002' }))
    fireEvent.click(screen.getByRole('button', { name: 'Show only this' }))
    await waitFor(() => expect(api.runBuilder).toHaveBeenCalledTimes(5))
    expect(api.runBuilder.mock.calls[4][0].filters).toContainEqual({ field: 'Source_No', operator: 'eq', value: 'C002' })

    // Saved as a report, it replaces the draft and does not make a second one.
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save report' })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: 'Save report' }))
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith({ id: 'r5', name: 'Item wise' }))
    expect(api.saveReport.mock.calls[1]).toEqual([expect.objectContaining({ name: 'Item wise' }), 'r5'])
})

test('a draft opens as it was left, even with parts missing', async () => {
    const saved = { id: 'd1', name: 'Half done', draft: true, spec: { name: 'Half done', service: 'ValueEntries', rows: [{ field: '' }], formulas: [{ label: '', expression: '=A+' }] } }
    const api = { getBuilderSchema: jest.fn().mockResolvedValue({ schema }), saveReport: jest.fn().mockResolvedValue({ report: { id: 'd1', name: 'Half done' } }) }
    render(<BCBuilder api={api} saved={saved} onSaved={() => {}} onClose={() => {}} notify={() => {}} />)
    expect(await screen.findByRole('heading', { name: 'Carry on with "Half done"' })).toBeInTheDocument()
    expect(await screen.findByLabelText('Formula 1')).toHaveValue('=A+')
    expect(screen.getByLabelText('Figure A works out')).toHaveValue('count')
    fireEvent.click(screen.getByRole('button', { name: 'Save progress' }))
    await waitFor(() => expect(api.saveReport).toHaveBeenCalledWith(expect.objectContaining({ name: 'Half done' }), 'd1', true))
})

const renderStatement = (api) => {
    const context = { setAlert: () => {}, setAlertState: () => {}, setAlertTimeout: () => {} }
    render(<ContextProvider.Provider value={context}><BCBankStatement api={api} lookups={{ banks: [{ value: 'B-HQ', label: 'B-HQ - Head office current account' }] }} /></ContextProvider.Provider>)
}
const openFile = async (rows) => {
    mockSheetRows = rows
    const file = { name: 'september.xlsx', arrayBuffer: async () => new ArrayBuffer(8) }
    fireEvent.change(screen.getByLabelText('Statement file'), { target: { files: [file] } })
    await screen.findByText('Columns in september.xlsx')
}

test('a statement is checked before it can be matched, and the result is shown by kind', async () => {
    const result = {
        bank: { bankAccountNo: 'B-HQ', name: 'Head office current account' },
        from: '2026-09-20', to: '2026-09-30', toleranceDays: 3,
        summary: { statementLines: 2, matched: 1, statementOnly: 1, statementOnlyAmount: -50, ledgerOnly: 0, ledgerOnlyAmount: 0, amountDiffers: 0, amountDifference: 0, statementTotal: -50050, ledgerTotal: -50000, difference: -50 },
        tables: Object.fromEntries(['matched', 'statementOnly', 'ledgerOnly', 'amountDiffers', 'duplicateLines', 'duplicateEntries'].map((key) => [key, { columns: [{ key: 'statementDescription', label: 'Statement description', type: 'text' }, { key: 'statementAmount', label: 'Statement amount', type: 'money', total: true }], rows: key === 'statementOnly' ? [{ statementDescription: 'SMS ALERT FEE', statementAmount: -50 }] : (key === 'matched' ? [{ statementDescription: 'TRF TO NORTH', statementAmount: -50000 }] : []), totals: {} }])),
    }
    const api = { matchStatement: jest.fn().mockResolvedValue({ result }) }
    renderStatement(api)

    // A file with an unreadable date: not ready, and the row is named.
    await openFile([['Date', 'Description', 'Money in', 'Money out'], ['20/09/2026', 'TRF TO NORTH', '', 50000], ['soon', 'SMS ALERT FEE', '', 50]])
    expect(screen.getByRole('status')).toHaveTextContent('Not ready to match. 2 things have to be put right first.')
    expect(screen.getByText(/No bank account chosen/)).toBeInTheDocument()
    expect(screen.getByText(/1 row has no readable date/)).toBeInTheDocument()
    expect(screen.getByText(/Spreadsheet row: 3\./)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Match against Business Central' })).toBeDisabled()

    // Put right, with the bank chosen: ready, with what was checked listed.
    await openFile([['Date', 'Description', 'Money in', 'Money out'], ['20/09/2026', 'TRF TO NORTH', '', 50000], ['30/09/2026', 'SMS ALERT FEE', '', 50]])
    fireEvent.change(screen.getByLabelText('Bank account'), { target: { value: 'B-HQ' } })
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/Ready to match/))
    expect(screen.getByText(/2 lines from 2026-09-20 to 2026-09-30/)).toBeInTheDocument()
    expect(screen.getByLabelText('Column for Money out')).toHaveValue('3')

    fireEvent.click(screen.getByRole('button', { name: 'Match against Business Central' }))
    await waitFor(() => expect(api.matchStatement).toHaveBeenCalledWith({
        bankAccountNo: 'B-HQ',
        toleranceDays: 3,
        lines: [
            { line: 2, date: '2026-09-20', description: 'TRF TO NORTH', reference: '', amount: -50000, balance: null },
            { line: 3, date: '2026-09-30', description: 'SMS ALERT FEE', reference: '', amount: -50, balance: null },
        ],
    }))
    // The first kind with anything in it is shown: what still needs posting.
    // The file's own preview shows the same words, so wait for the results.
    expect(await screen.findByRole('button', { name: 'On the statement, not posted (1)' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getAllByRole('cell', { name: 'SMS ALERT FEE' }).length).toBeGreaterThan(1)
    fireEvent.click(screen.getByRole('button', { name: 'Matched (1)' }))
    expect(screen.getByRole('button', { name: 'Matched (1)' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByText('Statement less Business Central')).toBeInTheDocument()
    expect(screen.getByText('-50,050.00 against -50,000.00')).toBeInTheDocument()
})
