import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import BCCustomise from './BCCustomise'

const report = {
    params: { from: '2026-09-01', to: '2026-09-30' },
    columns: [
        { key: 'itemNo', label: 'Item No.', type: 'text' },
        { key: 'location', label: 'Location', type: 'text' },
        { key: 'closingQty', label: 'Closing qty', type: 'qty' },
        { key: 'unitCost', label: 'Unit cost', type: 'money' },
    ],
}
const base = { key: 'stock', title: 'Stock Report', filters: [{ key: 'dateRange', type: 'dateRange' }] }

const open = (definition, api) => {
    const notify = jest.fn()
    const onSaved = jest.fn()
    render(<BCCustomise api={api} definition={definition} report={report} values={{}} notify={notify} onSaved={onSaved} onClose={() => {}} />)
    return { notify, onSaved }
}

test('a built report gains a calculated column, a condition and a reader filter, and saves them with its columns', async () => {
    const api = { customiseReport: jest.fn(() => Promise.resolve({ ok: true })), reconcileColumns: jest.fn() }
    const { onSaved } = open({ ...base, reconcileBuiltIn: { kind: 'stock', title: 'Stock count and movements' } }, api)

    fireEvent.click(screen.getByRole('button', { name: 'Calculated columns' }))
    expect(screen.getByText(/\[Closing qty\] \[Unit cost\]/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Add a calculated column' }))
    fireEvent.change(screen.getByLabelText('Name of calculated column 1'), { target: { value: 'Value check' } })
    fireEvent.change(screen.getByLabelText('Formula of calculated column 1'), { target: { value: '[Closing qty] * [Unit cost]' } })
    fireEvent.change(screen.getByLabelText('Kind of figure for calculated column 1'), { target: { value: 'money' } })

    fireEvent.click(screen.getByRole('button', { name: 'Filters' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add a condition' }))
    // The new calculated column can be used straight away.
    fireEvent.change(screen.getByLabelText('Column of condition 1'), { target: { value: screen.getByRole('option', { name: 'Value check' }).value } })
    fireEvent.change(screen.getByLabelText('Test of condition 1'), { target: { value: 'gt' } })
    fireEvent.change(screen.getByLabelText('Value of condition 1'), { target: { value: '100' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add a filter for the reader' }))
    fireEvent.change(screen.getByLabelText('Column of reader filter 1'), { target: { value: 'location' } })

    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(onSaved).toHaveBeenCalled())
    const [key, sent] = api.customiseReport.mock.calls[0]
    expect(key).toBe('stock')
    expect(sent.calcs).toEqual([expect.objectContaining({ label: 'Value check', expression: '[Closing qty] * [Unit cost]', format: 'money' })])
    expect(sent.conditions).toEqual([{ column: sent.calcs[0].key, operator: 'gt', value: '100', label: 'Value check' }])
    expect(sent.prompts).toEqual([{ column: 'location', label: 'Location' }])
    expect(sent.knownColumns.map((column) => column.key)).toEqual(['itemNo', 'location', 'closingQty', 'unitCost'])
    expect(sent.reconcile).toMatchObject({ enabled: true, allowAdjustments: true, keyColumns: [], compareColumns: [] })
})

test('a report with its own reconciliation can be switched off, tuned, and given required columns', async () => {
    const api = {
        customiseReport: jest.fn(() => Promise.resolve({ ok: true })),
        reconcileColumns: jest.fn(() => Promise.resolve({ ok: true, columns: {
            figures: [{ key: 'itemNo', label: 'Item No.', type: 'text', required: true }, { key: 'openingQty', label: 'Opening qty', type: 'number' }, { key: 'closingQty', label: 'Closing qty (counted)', type: 'number' }],
            transactions: [{ key: 'date', label: 'Date', type: 'date', required: true }, { key: 'lotNo', label: 'Lot No.', type: 'text' }],
        } })),
    }
    open({ ...base, reconcileBuiltIn: { kind: 'stock', title: 'Stock count and movements' } }, api)
    fireEvent.click(screen.getByRole('button', { name: 'Reconciliation' }))
    await screen.findByText('Opening qty')
    // A column the reconciliation needs anyway is shown ticked and fixed.
    expect(screen.getByRole('checkbox', { name: /Date/ })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: /Date/ })).toBeDisabled()
    fireEvent.click(screen.getByRole('checkbox', { name: /Opening qty/ }))
    fireEvent.click(screen.getByRole('checkbox', { name: /Offer an adjustment/ }))
    fireEvent.change(screen.getByPlaceholderText('7'), { target: { value: '3' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(api.customiseReport).toHaveBeenCalled())
    expect(api.customiseReport.mock.calls[0][1].reconcile).toMatchObject({ enabled: true, allowAdjustments: false, matchDays: '3', required: ['openingQty'] })
})

test('a report with no reconciliation gets one by choosing the columns that name a line and the figures', async () => {
    const api = { customiseReport: jest.fn(() => Promise.resolve({ ok: true })), reconcileColumns: jest.fn() }
    open({ ...base, key: 'valuation' }, api)
    fireEvent.click(screen.getByRole('button', { name: 'Reconciliation' }))
    const allow = screen.getByRole('checkbox', { name: /Let readers reconcile/ })
    expect(allow).not.toBeChecked()
    fireEvent.click(allow)
    expect(screen.getByText(/Choose at least one column/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Item No.' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Closing qty' }))
    expect(screen.queryByText(/Choose at least one column/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(api.customiseReport).toHaveBeenCalled())
    expect(api.customiseReport.mock.calls[0][1].reconcile).toMatchObject({
        enabled: true,
        keyColumns: [{ key: 'itemNo', label: 'Item No.' }],
        compareColumns: [{ key: 'closingQty', label: 'Closing qty', type: 'qty' }],
    })
    expect(api.reconcileColumns).not.toHaveBeenCalled()
})
