import { fireEvent, render, screen, within } from '@testing-library/react'
import BCDataTable from './BCDataTable'

const columns = [
    { key: 'postingDate', label: 'Posting date', type: 'date' },
    { key: 'entryType', label: 'Type', type: 'text' },
    { key: 'documentNo', label: 'Document No.', type: 'text' },
    { key: 'quantity', label: 'Quantity', type: 'qty', total: true },
    { key: 'salesAmount', label: 'Sales amount', type: 'money', total: true },
]
const rows = [
    { postingDate: '2026-08-30', entryType: 'Sale', documentNo: 'SS-0001', quantity: -4000, salesAmount: 200000 },
    { postingDate: '2026-09-10', entryType: 'Sale', documentNo: 'SS-0002', quantity: -5000, salesAmount: 250000 },
    { postingDate: '2026-09-12', entryType: 'Transfer', documentNo: 'TS-0001', quantity: 6000, salesAmount: 0 },
]
const totals = { quantity: -3000, salesAmount: 450000 }

// A table's row groups come in order: heading, body, footer.
const group = (index) => within(screen.getAllByRole('rowgroup')[index])
const footer = () => group(2).getAllByRole('cell').map((cell) => cell.textContent)
// The "No rows match." line is itself a row, so it is not counted.
const bodyRows = () => (screen.queryByText('No rows match.') ? 0 : group(1).getAllByRole('row').length)

const setup = () => {
    const onView = jest.fn()
    render(<BCDataTable columns={columns} rows={rows} totals={totals} filterable onView={onView} />)
    return { onView, last: () => onView.mock.calls[onView.mock.calls.length - 1][0] }
}

test('every column has a filter, and totals follow the filtered rows', () => {
    const { last } = setup()
    columns.forEach((column) => expect(screen.getByLabelText(`Filter by ${column.label}`)).toBeInTheDocument())
    expect(footer()).toEqual(['Total', '', '', '-3,000', '450,000.00'])

    // A column with few values is a pick list.
    fireEvent.change(screen.getByLabelText('Filter by Type'), { target: { value: 'Sale' } })
    expect(bodyRows()).toBe(2)
    expect(footer()).toEqual(['Total (filtered)', '', '', '-9,000', '450,000.00'])
    expect(last()).toMatchObject({ filtered: true, totals: { quantity: -9000, salesAmount: 450000 }, filters: { Type: 'Sale' } })
    expect(last().rows).toHaveLength(2)

    // Filters on different columns combine.
    fireEvent.change(screen.getByLabelText('Filter by Sales amount'), { target: { value: '>200,000' } })
    expect(bodyRows()).toBe(1)
    expect(footer()).toEqual(['Total (filtered)', '', '', '-5,000', '250,000.00'])
    expect(last().filters).toEqual({ Type: 'Sale', 'Sales amount': '>200,000' })

    // Clearing brings back every row and the original totals.
    fireEvent.click(screen.getByText('Clear filters'))
    expect(bodyRows()).toBe(3)
    expect(footer()).toEqual(['Total', '', '', '-3,000', '450,000.00'])
    expect(last()).toMatchObject({ filtered: false, totals, filters: {} })
    expect(screen.queryByText('Clear filters')).toBeNull()
})

test('dates and numbers accept ranges, comparisons and part of a value', () => {
    setup()
    const type = (label, value) => fireEvent.change(screen.getByLabelText(`Filter by ${label}`), { target: { value } })

    type('Posting date', '2026-09')
    expect(bodyRows()).toBe(2)
    type('Posting date', '2026-08-01..2026-09-10')
    expect(bodyRows()).toBe(2)
    type('Posting date', '>=2026-09-12')
    expect(bodyRows()).toBe(1)
    type('Posting date', '')

    type('Quantity', '<0')
    expect(bodyRows()).toBe(2)
    type('Quantity', '-5000..-4000')
    expect(bodyRows()).toBe(2)
    type('Quantity', '=6000')
    expect(bodyRows()).toBe(1)
    type('Quantity', '5,000')
    expect(bodyRows()).toBe(1)
    type('Quantity', '>99999')
    expect(screen.getByText('No rows match.')).toBeInTheDocument()
    expect(footer()).toEqual(['Total (filtered)', '', '', '0', '0.00'])
})

test('a table that is not filterable has no filter row and keeps its totals', () => {
    render(<BCDataTable columns={columns} rows={rows} totals={totals} />)
    expect(screen.queryByLabelText('Filter by Type')).toBeNull()
    expect(footer()).toEqual(['Total', '', '', '-3,000', '450,000.00'])
})

// A statement: sections with headings, groups inside them, and totals.
const statementColumns = [
    { key: 'name', label: 'Account', type: 'text', indent: true },
    { key: 'amount', label: 'Amount', type: 'money' },
]
const statement = [
    { _level: 0, _heading: true, _emphasis: true, name: 'Cost of sales', amount: '' },
    { _level: 1, _heading: true, _emphasis: true, name: 'Materials', amount: '' },
    { _level: 2, name: 'Caps', amount: 10 },
    { _level: 2, name: 'Labels', amount: 20 },
    { _level: 1, _emphasis: true, name: 'Total materials', amount: 30 },
    { _level: 1, name: 'Freight', amount: 5 },
    { _level: 0, _emphasis: true, name: 'Total cost of sales', amount: 35 },
    { _level: 0, _heading: true, _emphasis: true, _expanded: true, name: 'Summary', amount: '' },
    { _level: 1, _emphasis: true, name: 'Net', amount: 35 },
]
const shownNames = () => group(1).getAllByRole('row').map((row) => row.cells[0].textContent.replace(/[▸▾]/g, ''))

test('a statement opens with its groups closed to their totals, and each opens on a click', () => {
    render(<BCDataTable columns={statementColumns} rows={statement} />)
    // Closed: a section shows as its total. A summary marked to start open stays open.
    expect(shownNames()).toEqual(['Total cost of sales', 'Summary', 'Net'])
    fireEvent.click(screen.getByRole('button', { name: 'Expand Cost of sales' }))
    // Open: its heading, its groups closed to their totals, and its own total.
    expect(shownNames()).toEqual(['Cost of sales', 'Total materials', 'Freight', 'Total cost of sales', 'Summary', 'Net'])
    fireEvent.click(screen.getByRole('button', { name: 'Expand Materials' }))
    expect(shownNames()).toEqual(['Cost of sales', 'Materials', 'Caps', 'Labels', 'Total materials', 'Freight', 'Total cost of sales', 'Summary', 'Net'])
    fireEvent.click(screen.getByRole('button', { name: 'Collapse Cost of sales' }))
    expect(shownNames()).toEqual(['Total cost of sales', 'Summary', 'Net'])
    fireEvent.click(screen.getByRole('button', { name: 'Expand all' }))
    expect(shownNames()).toHaveLength(statement.length)
    fireEvent.click(screen.getByRole('button', { name: 'Collapse all' }))
    expect(shownNames()).toEqual(['Total cost of sales', 'Summary'])
})

test('sorted or searched, a statement lists every row flat', () => {
    render(<BCDataTable columns={statementColumns} rows={statement} />)
    fireEvent.change(screen.getByLabelText('Search rows'), { target: { value: 'a' } })
    expect(shownNames()).toContain('Caps')
    expect(screen.queryByRole('button', { name: /^Expand / })).toBeNull()
})
