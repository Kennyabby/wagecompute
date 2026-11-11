import { render, screen, fireEvent } from '@testing-library/react'
import UnsyncedDevices from './UnsyncedDevices'

const offlineTill = {
    user: '32',
    terminalId: '37639666',
    lastSeenAt: Date.now() - 8 * 24 * 3600000,
    offline: true,
    device: { kind: 'mobile', os: 'Android', browser: 'Chrome', app: 'Browser' },
    count: 3,
    orders: [
        { orderNumber: 'ORD-2', onServer: true, status: 'pending', delivery: 'pending', businessDate: '2026-10-07', changes: { delivery: 1 } },
        { orderNumber: 'ORD-9', onServer: false, changes: { 'new order': 1, payment: 1 } },
    ],
    other: { session: 1 },
    errors: [],
}

test('collapsed to one line that says how much is waiting', () => {
    render(<UnsyncedDevices tills={[offlineTill]} refused={[]} canClear={false} onClear={() => {}} />)
    expect(screen.getByText(/1 device holding 3 changes not yet on the server/)).toBeTruthy()
})

test('lists each order with what is waiting, the device kind, and when it went offline', () => {
    const { container } = render(<UnsyncedDevices tills={[offlineTill]} refused={[]} canClear={false} onClear={() => {}} />)
    container.querySelector('details').open = true
    expect(screen.getByText(/32's mobile phone \(Android, Chrome\), device 37639666/)).toBeTruthy()
    expect(screen.getByText(/Offline since .* \(8 days ago\)/)).toBeTruthy()
    expect(screen.getByText(/on the server, pending, delivery pending, 2026-10-07. Waiting: delivery./)).toBeTruthy()
    expect(screen.getByText(/not on the server yet. Waiting: new order, payment./)).toBeTruthy()
    expect(screen.getByText('Also waiting: session.')).toBeTruthy()
})

test('an admin can clear an offline device, nobody else', () => {
    const onClear = jest.fn()
    const { rerender } = render(<UnsyncedDevices tills={[offlineTill]} refused={[]} canClear={false} onClear={onClear} />)
    expect(screen.queryByRole('button', { name: /Clear this device/ })).toBeNull()
    rerender(<UnsyncedDevices tills={[offlineTill]} refused={[]} canClear onClear={onClear} />)
    fireEvent.click(screen.getByRole('button', { name: /Clear this device/ }))
    expect(onClear).toHaveBeenCalledWith(offlineTill)
    rerender(<UnsyncedDevices tills={[{ ...offlineTill, offline: false }]} refused={[]} canClear onClear={onClear} />)
    expect(screen.queryByRole('button', { name: /Clear this device/ })).toBeNull()
})

test('nothing waiting shows nothing', () => {
    const { container } = render(<UnsyncedDevices tills={[]} refused={[]} canClear onClear={() => {}} />)
    expect(container.innerHTML).toBe('')
})
