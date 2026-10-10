import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import ContextProvider from '../../Resources/ContextProvider'
import BCTransactions from './BCTransactions'

jest.mock('../../utils/exportUtils', () => ({ generatePDF: jest.fn(), generateExcel: jest.fn() }))

const definition = {
    key: 'transactionHistory',
    available: true,
    filters: [
        { key: 'dateRange', type: 'dateRange', label: 'Period' },
        { key: 'search', type: 'text', label: 'Document No. contains' },
    ],
}
const summary = {
    openingStock: 40010, openingStockCost: 285000, purchases: 10000, purchasesCost: 120000, sales: -9000, salesValue: 450000, costOfGoodsSold: 180000,
    transfersIn: 6000, transfersOut: -6000, transfersInCost: 120000, transfersOutCost: -120000, netTransferCost: 0,
    positiveAdjustments: 100, negativeAdjustments: -500, positiveAdjustmentsCost: 1200, negativeAdjustmentsCost: -1000, netAdjustmentCost: 200,
    consumed: -24000, consumedCost: -168000, produced: 12000, producedCost: 240000, netProductionCost: 72000,
    closingStock: 28610, closingStockCost: 297200, averageCost: 10.39,
}
const report = {
    key: 'transactionHistory',
    params: { from: '2026-09-01', to: '2026-09-30' },
    columns: [
        { key: 'postingDate', label: 'Date', type: 'date' },
        { key: 'documentNo', label: 'Document No.', type: 'text' },
        { key: 'quantity', label: 'Quantity', type: 'qty', total: true, signed: true },
        { key: 'duplicate', label: 'Possible duplicate', type: 'text' },
    ],
    rows: [
        { postingDate: '2026-09-10', documentNo: 'SS-0001', quantity: -4000, duplicate: 'Yes' },
        { postingDate: '2026-09-10', documentNo: 'SS-0009', quantity: -4000, duplicate: 'Yes' },
        { postingDate: '2026-09-15', documentNo: 'SS-0002', quantity: -5000, duplicate: '' },
    ],
    totals: { quantity: -13000 },
    meta: { note: '', summary, duplicates: 2, listed: 3, total: 3 },
}
const breakdown = {
    kind: 'ledger',
    columns: [{ key: 'itemNo', label: 'Item No.', type: 'text' }, { key: 'quantity', label: 'Quantity', type: 'qty', total: true }],
    rows: [{ itemNo: 'FG-75CL', quantity: -9000 }],
    totals: { quantity: -9000 },
    meta: { rowCount: 1, note: '' },
}

const setup = () => {
    const api = {
        getReports: jest.fn().mockResolvedValue({ reports: [definition] }),
        runReport: jest.fn().mockResolvedValue({ report }),
        drillReport: jest.fn().mockResolvedValue({ breakdown }),
    }
    const context = { setAlert: () => {}, setAlertState: () => {}, setAlertTimeout: () => {} }
    render(<ContextProvider.Provider value={context}><BCTransactions api={api} lookups={{}} onGoTo={() => {}} /></ContextProvider.Provider>)
    return api
}

const bodyRows = () => within(screen.getAllByRole('rowgroup')[1]).getAllByRole('row').length

test('the summary cards show the stock position and open what is behind them', async () => {
    const api = setup()
    const sales = await screen.findByRole('button', { name: /^Sales/ })
    expect(sales).toHaveTextContent('-9,000')
    expect(sales).toHaveTextContent('Value: 450,000.00')
    expect(sales).toHaveTextContent('Cost of goods sold: 180,000.00')
    expect(screen.getByRole('button', { name: /^Transfers/ })).toHaveTextContent('+6,000 / -6,000')
    expect(screen.getByRole('button', { name: /^Closing stock/ })).toHaveTextContent('Average cost: 10.39')

    fireEvent.click(sales)
    await waitFor(() => expect(api.drillReport).toHaveBeenCalledWith('transactionHistory', report.params, { column: 'sales', row: {} }))
    const dialog = await screen.findByRole('dialog', { name: 'Sales' })
    expect(await within(dialog).findByRole('cell', { name: 'FG-75CL' })).toBeInTheDocument()
    expect(within(dialog).getByText(/made up of 1 line\./)).toBeInTheDocument()
})

test('possible duplicates can be shown on their own, columns chosen and the page size changed', async () => {
    setup()
    expect(await screen.findByRole('cell', { name: 'SS-0002' })).toBeInTheDocument()
    expect(bodyRows()).toBe(3)
    fireEvent.click(screen.getByRole('button', { name: 'Show only these' }))
    expect(bodyRows()).toBe(2)
    expect(screen.queryByRole('cell', { name: 'SS-0002' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Show all transactions' }))
    expect(bodyRows()).toBe(3)

    // Hide a column, then bring it back.
    fireEvent.click(screen.getByRole('button', { name: 'Columns' }))
    fireEvent.click(within(screen.getByRole('group', { name: 'Columns to show' })).getByLabelText('Document No.'))
    expect(screen.queryByRole('cell', { name: 'SS-0001' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Done choosing columns' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Show all' }))
    expect(screen.getByRole('cell', { name: 'SS-0001' })).toBeInTheDocument()

    expect([...screen.getByLabelText('Rows per page').options].map((option) => option.value)).toEqual(['25', '50', '100', '250'])
})

test('Reset puts the filters back and reads again', async () => {
    const api = setup()
    await screen.findByRole('cell', { name: 'SS-0002' })
    fireEvent.change(screen.getByLabelText('Document No. contains'), { target: { value: 'SS-0001' } })
    fireEvent.click(screen.getByRole('button', { name: 'Apply filters' }))
    await waitFor(() => expect(api.runReport).toHaveBeenLastCalledWith('transactionHistory', expect.objectContaining({ search: 'SS-0001' })))
    // Reset is held back while the last request is still running.
    await waitFor(() => expect(screen.getByRole('button', { name: 'Reset' })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
    await waitFor(() => expect(api.runReport).toHaveBeenLastCalledWith('transactionHistory', expect.objectContaining({ search: '' })))
})
