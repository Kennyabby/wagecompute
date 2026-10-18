import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import BCAccessUsers, { accessWarnings } from './BCAccessUsers'

const catalogue = {
    tabs: [{ key: 'dashboard', label: 'Dashboard' }, { key: 'reports', label: 'Reports' }, { key: 'connection', label: 'Connection' }],
    actions: [
        { key: 'reports.export', group: 'Reports', label: 'Export reports to Excel and PDF' },
        { key: 'recon.import', group: 'Reconciliation', label: 'Download reconciliation templates and import files' },
        { key: 'recon.configure', group: 'Reconciliation', label: 'Switch reconciliation on or off for a report and change its settings' },
    ],
    presets: [{ key: 'viewer', label: 'Viewer', tabs: ['dashboard', 'reports'], actions: ['reports.export'], reports: { all: true, custom: true } }],
    domains: [{ key: 'inventory', label: 'Inventory' }, { key: 'finance', label: 'Finance' }],
    reports: [{ key: 'stock', title: 'Stock Report', domain: 'inventory' }, { key: 'lotTrace', title: 'Lot Trace', domain: 'inventory' }, { key: 'trialBalance', title: 'Trial Balance', domain: 'finance' }],
    asBefore: { tabs: ['dashboard', 'reports'], actions: ['reports.export', 'recon.import'], reports: { all: true, custom: true, domains: [], keys: [] } },
}
const users = [
    { email: 'boss@test', name: 'Boss', admin: true, hasModule: true, access: null },
    { email: 'ada@test', name: 'Ada', admin: false, hasModule: true, access: null },
    { email: 'tunde@test', name: 'Tunde', admin: false, hasModule: true, access: { tabs: ['reports'], actions: ['recon.import'], reports: { all: false, custom: false, domains: ['finance'], keys: [] }, updatedAt: 1 } },
    { email: 'cashier@test', name: 'Cashier', admin: false, hasModule: false, access: null },
]
const makeApi = () => ({
    getAccessCatalogue: jest.fn(() => Promise.resolve({ ok: true, ...catalogue })),
    getAccessUsers: jest.fn(() => Promise.resolve({ ok: true, users })),
    saveAccess: jest.fn(() => Promise.resolve({ ok: true })),
    resetAccess: jest.fn(() => Promise.resolve({ ok: true })),
})

test('lists the users who have Business Central, with where their access stands', async () => {
    render(<BCAccessUsers api={makeApi()} />)
    expect(await screen.findByRole('button', { name: /Boss.*Admin: everything/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Ada.*As before/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Tunde.*Set here/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Cashier/ })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Show users without Business Central' }))
    expect(screen.getByRole('button', { name: /Cashier.*No Business Central/ })).toBeInTheDocument()
})

test('a user with nothing saved starts from what they have now, and is narrowed to some reports and actions', async () => {
    const api = makeApi()
    const notify = jest.fn()
    render(<BCAccessUsers api={api} notify={notify} />)
    fireEvent.click(await screen.findByRole('button', { name: /Ada/ }))
    expect(screen.getByText(/Nothing saved yet/)).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /Download reconciliation templates/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Every report' })).toBeChecked()

    fireEvent.click(screen.getByRole('radio', { name: 'Only the ones chosen' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'All inventory reports' }))
    // A whole section covers its reports, which show ticked and fixed.
    expect(screen.getByRole('checkbox', { name: 'Lot Trace' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Lot Trace' })).toBeDisabled()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Trial Balance' }))
    fireEvent.click(screen.getByRole('checkbox', { name: /Switch reconciliation on or off/ }))
    fireEvent.click(screen.getByRole('checkbox', { name: /Export reports/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Save access' }))
    await waitFor(() => expect(api.saveAccess).toHaveBeenCalled())
    expect(api.saveAccess.mock.calls[0]).toEqual(['ada@test', {
        tabs: ['dashboard', 'reports'],
        actions: ['recon.import', 'recon.configure'],
        reports: { all: false, custom: true, domains: ['inventory'], keys: ['trialBalance'] },
    }])
    expect(notify).toHaveBeenCalledWith('success', expect.stringMatching(/next click/))
})

test('presets, copying and going back to as before', async () => {
    const api = makeApi()
    window.confirm = jest.fn(() => true)
    render(<BCAccessUsers api={api} />)
    fireEvent.click(await screen.findByRole('button', { name: /Ada/ }))
    fireEvent.change(screen.getByLabelText('Copy access from another user'), { target: { value: 'tunde@test' } })
    expect(screen.getByRole('checkbox', { name: 'All finance reports' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Dashboard' })).not.toBeChecked()
    fireEvent.click(screen.getByRole('button', { name: 'Viewer' }))
    expect(screen.getByRole('checkbox', { name: 'Dashboard' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Every report' })).toBeChecked()

    fireEvent.click(screen.getByRole('button', { name: /Tunde/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Back to as before' }))
    await waitFor(() => expect(api.resetAccess).toHaveBeenCalledWith('tunde@test'))
})

test('admins and users without the module are explained, not edited', async () => {
    render(<BCAccessUsers api={makeApi()} />)
    fireEvent.click(await screen.findByRole('button', { name: /Boss/ }))
    expect(screen.getByText(/Admins of the workspace can do everything/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save access' })).not.toBeInTheDocument()
})

test('combinations that would not work are pointed out', () => {
    expect(accessWarnings({ tabs: ['reports'], actions: ['builder.save'], reports: { all: false, custom: false, domains: [], keys: [] } })).toEqual([
        'The Reports tab is chosen but no reports are, so it will be empty.',
        'Saving built reports needs the report builder too.',
        'The report builder is allowed but built reports are not visible, so saved reports will not show in the list.',
    ])
    expect(accessWarnings({ tabs: ['reports'], actions: ['reports.export'], reports: { all: true, custom: true, domains: [], keys: [] } })).toEqual([])
})
