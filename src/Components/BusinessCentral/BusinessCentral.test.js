import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import ContextProvider from '../../Resources/ContextProvider'
import BusinessCentral from './BusinessCentral'

// The PDF library needs browser features the test environment lacks, and
// nothing here exports a file.
jest.mock('../../utils/exportUtils', () => ({ generatePDF: jest.fn(), generateExcel: jest.fn() }))

// The server, reduced to what the module's shell asks of it. `live` is what
// the next look at Business Central will report.
const makeServer = () => {
    const state = { calls: [], live: { ready: true, seq: 0, changes: [] }, connections: [
        { id: 'connection', name: 'Water factory', company: 'Jazmye Water Factory LIVE', primary: true, ready: true },
        { id: 'c2', name: 'Drinks factory', company: 'Jazmye Drinks', primary: false, ready: true },
    ] }
    const connectionOf = (id) => {
        const entry = state.connections.find((candidate) => candidate.id === (id || 'connection')) || state.connections[0]
        return { ...entry, baseUrl: 'http://203.0.113.10:8080/bcodata', authType: 'ntlm', username: 'reader', hasPassword: true, discoveredAt: 1, storageMode: 'live', datasets: {}, services: [] }
    }
    const fetchServer = jest.fn(async (method, body, endpoint) => {
        state.calls.push({ method, endpoint, connectionId: body?.connectionId || '' })
        if (endpoint === 'bc/connection') return { ok: true, connection: connectionOf(body?.connectionId), connections: state.connections, datasets: [], secretsConfigured: true, canManage: true, storageMode: 'live' }
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

beforeEach(() => { window.localStorage.clear() })
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
