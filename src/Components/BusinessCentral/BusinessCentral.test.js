import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import ContextProvider from '../../Resources/ContextProvider'
import BusinessCentral from './BusinessCentral'

// The PDF library needs browser features the test environment lacks, and
// nothing here exports a file.
jest.mock('../../utils/exportUtils', () => ({ generatePDF: jest.fn(), generateExcel: jest.fn() }))
jest.mock('./bcEinvFiles', () => ({ downloadTemplate: jest.fn(), printInvoice: jest.fn(), readSpreadsheet: jest.fn() }))

// The server, reduced to what the module's shell asks of it. `live` is what
// the next look at Business Central will report.
const makeServer = () => {
    const state = { calls: [], live: { ready: true, seq: 0, changes: [] }, connections: [
        { id: 'connection', name: 'Water factory', company: 'Jazmye Water Factory LIVE', primary: true, ready: true },
        { id: 'c2', name: 'Drinks factory', company: 'Jazmye Drinks', primary: false, ready: true },
    ], publishedServices: ['ItemApplicationEntries', 'PostedItemTrackingLines'] }
    const connectionOf = (id) => {
        const entry = state.connections.find((candidate) => candidate.id === (id || 'connection')) || state.connections[0]
        return { ...entry, baseUrl: 'http://203.0.113.10:8080/bcodata', authType: 'ntlm', username: 'reader', hasPassword: true, discoveredAt: 1, storageMode: 'live', datasets: {}, services: state.publishedServices }
    }
    const fetchServer = jest.fn(async (method, body, endpoint) => {
        state.calls.push({ method, endpoint, connectionId: body?.connectionId || '' })
        if (endpoint === 'bc/connection') return { ok: true, connection: connectionOf(body?.connectionId), connections: state.connections, datasets: [], secretsConfigured: true, canManage: !state.access, storageMode: 'live', ...(state.access ? { access: state.access } : {}) }
        if (endpoint === 'bc/lookups') return { ok: true, lookups: { hasBranch: false, branchesKnown: true, items: [], locations: [], categories: [] } }
        if (endpoint === 'bc/dashboard') return { ok: true, dashboard: { comparedWith: { days: 30 }, kpis: [{ key: 'sales', label: `Sales of ${body?.connectionId || 'primary'}`, value: 1, format: 'money' }], charts: [], lists: { lowStock: [], idleStock: [] }, missing: [] } }
        if (endpoint === 'bc/live/status') return { ok: true, live: state.live }
        return { ok: true }
    })
    return { state, fetchServer }
}

const mountModule = (server) => {
    const alerts = []
    const context = {
        fetchServer: server.fetchServer,
        server: 'http://test',
        storePath: () => {},
        setAlert: (message) => alerts.push(message),
        setAlertState: () => {},
        setAlertTimeout: () => {},
    }
    render(<ContextProvider.Provider value={context}><BusinessCentral /></ContextProvider.Provider>)
    return alerts
}

beforeEach(() => {
    window.localStorage.clear()
    // Where the reader is lives in the address, so each test starts on a clean one.
    window.history.replaceState(null, '', '/business-central')
})
afterEach(() => { jest.useRealTimers() })

test('connections can be switched, and each request names the one chosen', async () => {
    const server = makeServer()
    mountModule(server)
    const switcher = await screen.findByLabelText('Business Central connection')
    expect([...switcher.options].map((option) => option.textContent)).toEqual(['Water factory (Jazmye Water Factory LIVE)', 'Drinks factory (Jazmye Drinks)'])
    expect(await screen.findByText('Sales of primary')).toBeInTheDocument()

    fireEvent.change(switcher, { target: { value: 'c2' } })
    expect(await screen.findByText('Sales of c2')).toBeInTheDocument()
    expect(screen.getByText('Drinks factory: Jazmye Drinks')).toBeInTheDocument()
    // Nothing asked after the switch still points at the first connection.
    const after = server.state.calls.slice(server.state.calls.findIndex((call) => call.connectionId === 'c2'))
    expect(after.every((call) => call.connectionId === 'c2')).toBe(true)
    expect(window.localStorage.getItem('bc.connectionId')).toBe('c2')

    // Back to the primary, which is asked for with no id at all.
    fireEvent.change(screen.getByLabelText('Business Central connection'), { target: { value: 'connection' } })
    expect(await screen.findByText('Sales of primary')).toBeInTheDocument()
    expect(window.localStorage.getItem('bc.connectionId')).toBeNull()
})

test('a remembered connection that no longer exists falls back to the primary', async () => {
    window.localStorage.setItem('bc.connectionId', 'gone')
    const server = makeServer()
    mountModule(server)
    expect(await screen.findByText('Sales of primary')).toBeInTheDocument()
    await waitFor(() => expect(window.localStorage.getItem('bc.connectionId')).toBeNull())
})

test('an admin can open the form for another connection and cancel out of it', async () => {
    const server = makeServer()
    mountModule(server)
    fireEvent.click(await screen.findByRole('button', { name: 'Add connection' }))
    expect(screen.getByText('New Business Central connection')).toBeInTheDocument()
    // Offered with the current connection's server and sign-in filled in.
    expect(screen.getByLabelText(/Same server and sign-in as Water factory/)).toBeChecked()
    expect(screen.getByDisplayValue('http://203.0.113.10:8080/bcodata')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(await screen.findByText('Sales of primary')).toBeInTheDocument()
})

test('the connection tab lists published services not mapped to built-in datasets', async () => {
    window.history.replaceState(null, '', '/business-central?tab=connection')
    const server = makeServer()
    mountModule(server)

    expect(await screen.findByText('Other published pages (2)')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Show service names'))
    expect(screen.getByText('ItemApplicationEntries')).toBeInTheDocument()
    expect(screen.getByText('PostedItemTrackingLines')).toBeInTheDocument()
    expect(screen.getByText(/the VM does not sync them/)).toBeInTheDocument()
})

test('changes found in Business Central are announced and the figures reloaded', async () => {
    jest.useFakeTimers()
    const server = makeServer()
    const alerts = mountModule(server)
    await act(async () => { await Promise.resolve() })
    await waitFor(() => expect(server.state.calls.some((call) => call.endpoint === 'bc/live/status')).toBe(true))
    await waitFor(() => expect(server.state.calls.some((call) => call.endpoint === 'bc/dashboard')).toBe(true))
    const dashboardLoads = () => server.state.calls.filter((call) => call.endpoint === 'bc/dashboard').length
    const before = dashboardLoads()
    expect(alerts).toEqual([])

    server.state.live = { ready: true, seq: 3, changes: [
        { id: 3, table: 'Customer ledger entries', added: 0, changed: 2, removed: 1 },
        { id: 2, table: 'Value entries', added: 12, changed: 0, removed: 0 },
        { id: 1, table: 'Item ledger entries', added: 4, changed: 0, removed: 0 },
    ] }
    await act(async () => { jest.advanceTimersByTime(46000); await Promise.resolve() })
    await waitFor(() => expect(alerts).toEqual(['Synced from Business Central: 16 new, 2 changed and 1 removed (Customer ledger entries, Value entries and 1 more).']))
    await waitFor(() => expect(dashboardLoads()).toBeGreaterThan(before))

    // The same changes are not announced twice.
    await act(async () => { jest.advanceTimersByTime(46000); await Promise.resolve() })
    expect(alerts).toHaveLength(1)
})

test('each tab has its own address, a refresh lands on it, and Back returns to the one before', async () => {
    const server = makeServer()
    mountModule(server)
    const tabs = within(await screen.findByRole('navigation', { name: 'Business Central sections' }))
    expect(tabs.getByRole('button', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page')
    // The default tab leaves the address clean.
    expect(window.location.search).toBe('')

    fireEvent.click(tabs.getByRole('button', { name: 'Reports' }))
    expect(window.location.search).toBe('?tab=reports')
    fireEvent.click(tabs.getByRole('button', { name: 'E-Invoicing' }))
    expect(window.location.search).toBe('?tab=einvoice')

    // Back, as the browser does it.
    act(() => {
        window.history.replaceState(null, '', '/business-central?tab=reports')
        window.dispatchEvent(new PopStateEvent('popstate'))
    })
    expect(tabs.getByRole('button', { name: 'Reports' })).toHaveAttribute('aria-current', 'page')
})

test('opening the module at a tab address opens that tab', async () => {
    window.history.replaceState(null, '', '/business-central?tab=bank')
    const server = makeServer()
    mountModule(server)
    const tabs = within(await screen.findByRole('navigation', { name: 'Business Central sections' }))
    expect(tabs.getByRole('button', { name: 'Bank statements' })).toHaveAttribute('aria-current', 'page')
})

test('an address with a tab that does not exist falls back to the dashboard', async () => {
    window.history.replaceState(null, '', '/business-central?tab=nonsense')
    const server = makeServer()
    mountModule(server)
    const tabs = within(await screen.findByRole('navigation', { name: 'Business Central sections' }))
    expect(tabs.getByRole('button', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page')
})

test('a report opened with filters keeps them in the address, so a refresh opens it the same way', async () => {
    window.history.replaceState(null, '', `/business-central?tab=reports&report=accountSection&preset=${encodeURIComponent(JSON.stringify({ from: '2026-09-01', to: '2026-09-30', section: 'expenses' }))}`)
    const server = makeServer()
    mountModule(server)
    const tabs = within(await screen.findByRole('navigation', { name: 'Business Central sections' }))
    expect(tabs.getByRole('button', { name: 'Reports' })).toHaveAttribute('aria-current', 'page')
    // Leaving the tab drops the report and its filters together.
    fireEvent.click(tabs.getByRole('button', { name: 'Dashboard' }))
    expect(window.location.search).toBe('')
})

test('document classes are found in the data, then named and saved', async () => {
    window.history.replaceState(null, '', '/business-central?tab=connection')
    const server = makeServer()
    const base = server.fetchServer.getMockImplementation()
    let saved = null
    server.fetchServer.mockImplementation(async (method, body, endpoint, ...rest) => {
        if (endpoint === 'bc/connection/document-classes/discover') return { ok: true, from: '2025-10-15', to: '2026-10-15', classes: [{ prefix: 'IJ', label: 'Adjustment' }], prefixes: [
            { prefix: 'IJ', items: 40, ledger: 40, amount: 120000, examples: ['IJ0001', 'IJ0002'], currentClass: 'Adjustment' },
            { prefix: 'DMG', items: 5, ledger: 5, amount: 9000, examples: ['DMG-0001'], currentClass: 'Other' },
        ] }
        if (endpoint === 'bc/connection/document-classes') { saved = body.classes; return { ok: true, documentClasses: body.classes } }
        return base(method, body, endpoint, ...rest)
    })
    const alerts = mountModule(server)
    const damages = await screen.findByLabelText('Class name for DMG')
    expect(screen.getByLabelText('Class name for IJ')).toHaveValue('Adjustment')
    fireEvent.change(damages, { target: { value: 'Damages' } })
    fireEvent.change(screen.getByPlaceholderText('For example DMG'), { target: { value: 'csm' } })
    fireEvent.change(screen.getByPlaceholderText('For example Damages'), { target: { value: 'Consumption' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save document classes' }))
    await waitFor(() => expect(saved).toEqual([{ prefix: 'IJ', label: 'Adjustment' }, { prefix: 'DMG', label: 'Damages' }, { prefix: 'CSM', label: 'Consumption' }]))
    await waitFor(() => expect(alerts.some((message) => /3 document class/.test(message))).toBe(true))
})

test('a user sees only the tabs and buttons their access allows', async () => {
    const server = makeServer()
    server.state.access = { admin: false, saved: true, tabs: ['reports'], actions: [], reports: { all: false, custom: false, domains: ['inventory'], keys: [] } }
    mountModule(server)
    const tabs = await screen.findByRole('navigation', { name: 'Business Central sections' })
    expect(within(tabs).getAllByRole('button').map((button) => button.textContent)).toEqual(['Reports'])
    expect(screen.queryByRole('button', { name: 'Read everything again' })).not.toBeInTheDocument()
    // The dashboard was asked for by nobody: the user may not open it.
    expect(server.state.calls.some((call) => call.endpoint === 'bc/dashboard')).toBe(false)
})

test('an admin gets the Access tab', async () => {
    const server = makeServer()
    mountModule(server)
    const tabs = await screen.findByRole('navigation', { name: 'Business Central sections' })
    expect(within(tabs).getByRole('button', { name: 'Access' })).toBeInTheDocument()
})
