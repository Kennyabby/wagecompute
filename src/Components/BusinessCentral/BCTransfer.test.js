import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import BCTransfer, { stepText } from './BCTransfer'

const connection = { id: 'connection', primary: true, company: 'Jazmye Water Factory LIVE', storageMode: 'stored' }

test('the workspace that has the connection makes a code, shown once, and can cancel it', async () => {
    const pending = { id: 't1', direction: 'out', status: 'pending', company: connection.company, createdAt: 1, createdBy: 'admin@test', moveData: true }
    let listed = []
    const api = {
        listTransfers: jest.fn(() => Promise.resolve({ ok: true, transfers: listed })),
        startTransfer: jest.fn(() => { listed = [pending]; return Promise.resolve({ ok: true, code: 'ABCD-EFGH-JKLM-NPQR', transfer: { ...pending, expiresAt: Date.now() + 86400000 } }) }),
        cancelTransfer: jest.fn(() => { listed = [{ ...pending, status: 'cancelled' }]; return Promise.resolve({ ok: true }) }),
    }
    render(<BCTransfer api={api} connection={connection} />)
    expect(await screen.findByText('Move Jazmye Water Factory LIVE to another workspace')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: /Move the stored copy too/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Make a transfer code' }))
    expect(await screen.findByLabelText('The transfer code')).toHaveTextContent('ABCD-EFGH-JKLM-NPQR')
    expect(api.startTransfer).toHaveBeenCalledWith({ connectionId: 'connection', moveData: false, moveEInvoice: true })
    expect(screen.getByText('Waiting for the code')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(api.cancelTransfer).toHaveBeenCalledWith('t1'))
    expect(await screen.findByText('Cancelled')).toBeInTheDocument()
    expect(screen.queryByLabelText('The transfer code')).not.toBeInTheDocument()
})

test('a new workspace receives a connection with the code, and the module reloads when it has arrived', async () => {
    jest.useFakeTimers()
    let listed = []
    const api = {
        listTransfers: jest.fn(() => Promise.resolve({ ok: true, transfers: listed })),
        acceptTransfer: jest.fn(() => {
            listed = [{ id: 't2', direction: 'in', status: 'moving', company: connection.company, createdAt: 1, progress: { step: 'stored:BC_GLEntries', moved: { BC_GLEntries: 4000 } } }]
            return Promise.resolve({ ok: true, transfer: listed[0] })
        }),
    }
    const onChanged = jest.fn()
    const notify = jest.fn()
    render(<BCTransfer api={api} connection={null} onChanged={onChanged} notify={notify} />)
    // Nothing to move out of a workspace with no connection.
    expect(screen.queryByRole('button', { name: 'Make a transfer code' })).not.toBeInTheDocument()
    const input = screen.getByLabelText('Transfer code')
    fireEvent.change(input, { target: { value: 'abcd-efgh' } })
    expect(screen.getByRole('button', { name: 'Receive' })).toBeDisabled()
    fireEvent.change(input, { target: { value: 'abcd-efgh-jklm-npqr' } })
    fireEvent.click(screen.getByRole('button', { name: 'Receive' }))
    await waitFor(() => expect(api.acceptTransfer).toHaveBeenCalledWith('ABCD-EFGH-JKLM-NPQR'))
    expect(await screen.findByText('Moving stored GLEntries (4,000 rows so far)')).toBeInTheDocument()

    listed = [{ ...listed[0], status: 'done', finishedAt: Date.now(), progress: { step: 'done' } }]
    await act(async () => { jest.advanceTimersByTime(3100) })
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1))
    expect(notify).toHaveBeenCalledWith('success', 'Jazmye Water Factory LIVE is now connected to this workspace.')
    jest.useRealTimers()
})

test('progress reads as words', () => {
    expect(stepText({ step: 'settings' })).toBe('Moving report edits, built reports and mappings')
    expect(stepText({ step: 'stored:BCItemDaily', moved: {} })).toBe('Moving stored BCItemDaily')
})
