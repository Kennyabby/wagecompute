import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import BCReports from './BCReports'

jest.mock('../../utils/exportUtils', () => ({ generatePDF: jest.fn(), generateExcel: jest.fn() }))

const catalogue = {
    connected: true,
    domains: [{ key: 'custom', label: 'My reports' }],
    reports: [{ key: 'custom:r1', title: 'Item Sales Customer Wise', domain: 'custom', description: 'Built from Value Entries.', filters: [], available: true, custom: { id: 'r1', createdBy: 'me@test', pinned: true, draft: false } }],
}

test('a built report is only deleted after its name has been typed', async () => {
    const api = { getReports: jest.fn().mockResolvedValue(catalogue), deleteReport: jest.fn().mockResolvedValue({ ok: true }) }
    const notify = jest.fn()
    const confirm = jest.spyOn(window, 'confirm')
    render(<BCReports api={api} lookups={{}} openKey='' onOpenKey={() => {}} onGoTo={() => {}} notify={notify} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }))
    const box = within(screen.getByRole('dialog', { name: 'Delete Item Sales Customer Wise' }))
    // What will be lost is spelled out, and nothing has been deleted yet.
    expect(box.getByText(/removed for good/)).toHaveTextContent('It will also disappear from the dashboard.')
    expect(box.getByText('The data in Business Central is not touched.')).toBeInTheDocument()
    expect(api.deleteReport).not.toHaveBeenCalled()
    expect(confirm).not.toHaveBeenCalled()

    // The wrong name, or part of it, leaves the button off.
    const remove = box.getByRole('button', { name: 'Delete for good' })
    expect(remove).toBeDisabled()
    fireEvent.change(box.getByLabelText('Type the report name to confirm'), { target: { value: 'Item Sales' } })
    expect(remove).toBeDisabled()
    fireEvent.submit(screen.getByRole('dialog'))
    expect(api.deleteReport).not.toHaveBeenCalled()

    // Backing out keeps the report.
    fireEvent.click(box.getByRole('button', { name: 'Keep the report' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(api.deleteReport).not.toHaveBeenCalled()

    // The full name, in any capitals, switches it on.
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    fireEvent.change(screen.getByLabelText('Type the report name to confirm'), { target: { value: 'item sales customer wise' } })
    fireEvent.click(screen.getByRole('button', { name: 'Delete for good' }))
    await waitFor(() => expect(api.deleteReport).toHaveBeenCalledWith('r1'))
    await waitFor(() => expect(notify).toHaveBeenCalledWith('success', '"Item Sales Customer Wise" deleted.'))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
})
