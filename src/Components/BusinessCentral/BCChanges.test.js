import { render, screen, fireEvent, within, waitFor } from '@testing-library/react'
import BCChanges from './BCChanges'

const summary = [
    { dataset: 'Customers', label: 'Customers', added: 3, changed: 2, removed: 1, lastAt: Date.now() },
    { dataset: 'Items', label: 'Items', added: 1, changed: 4, removed: 0, lastAt: Date.now() - 1000 },
]
const change = (dataset, label, type = 'changed') => ({ id: `${dataset}-${type}`, dataset, datasetLabel: dataset, type, label, fieldCount: 1, fields: [{ field: 'Unit_Price', before: 10, after: 12 }], at: Date.now() })

test('View opens a pop-up with that table\'s changes, filterable, and Close or Escape shuts it', async () => {
    const api = {
        getChanges: jest.fn(async ({ dataset, type }) => ({
            changes: dataset === 'Items'
                ? [change('Items', 'LB0002 Label Wraps'), change('Items', 'BT0002 Bottled Water', 'added')].filter((c) => !type || c.type === type)
                : [change('Customers', 'C04000 JS SI')],
            hasMore: false,
            summary,
            summaryDays: 30,
        })),
    }
    render(<BCChanges api={api} datasets={[{ key: 'Customers', label: 'Customers' }, { key: 'Items', label: 'Items' }]} lastSyncedAt={1} onGoTo={() => {}} />)
    await screen.findByText('C04000 JS SI')

    fireEvent.click(screen.getByRole('button', { name: 'View changes in Items' }))
    const dialog = await screen.findByRole('dialog', { name: 'Changes in Items' })
    expect(dialog).toHaveTextContent('1 new, 4 changed, 0 removed')
    await within(dialog).findByText('LB0002 Label Wraps')
    expect(within(dialog).getByText('BT0002 Bottled Water')).toBeInTheDocument()
    expect(api.getChanges).toHaveBeenLastCalledWith(expect.objectContaining({ dataset: 'Items' }))

    // Values of a changed row open inside the pop-up.
    fireEvent.click(within(dialog).getByRole('button', { name: 'Show values' }))
    expect(within(dialog).getByText('Unit Price')).toBeInTheDocument()

    // Filtered to new rows only.
    fireEvent.change(within(dialog).getByLabelText('Kind of difference'), { target: { value: 'added' } })
    await waitFor(() => expect(within(dialog).queryByText('LB0002 Label Wraps')).toBeNull())
    expect(within(dialog).getByText('BT0002 Bottled Water')).toBeInTheDocument()

    // The list on the page is left as it was.
    expect(screen.getAllByText('C04000 JS SI').length).toBe(1)

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'View changes in Customers' }))
    const second = await screen.findByRole('dialog', { name: 'Changes in Customers' })
    fireEvent.click(within(second).getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).toBeNull()
})
