import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ContextProvider from '../../Resources/ContextProvider'
import Employees from './Employees'

jest.mock('heic2any', () => jest.fn())
jest.mock('../../Resources/ClientServerAPIConn/API/fileCrudApi', () => ({ uploadFile: jest.fn() }))

const stored = { _id: '6650f0c2a1b2c3d4e5f60718', i_d: 'EMP-7', firstName: 'Ada', lastName: 'Obi', department: 'Admin', position: 'Clerk', salary: '50000', createdAt: 1 }

const mount = (overrides = {}) => {
    const fetchServer = jest.fn(async () => ({ ok: true, err: false, updated: true }))
    const value = {
        storePath: () => {}, fetchServer, server: '', intervalPeriod: 3600000,
        company: 'demo', companyRecord: { status: 'admin', emailid: 'admin@test', permissions: [] },
        departments: [], centralCompany: null, positions: [], editAccess: { employees: true },
        employees: [stored], setEmployees: jest.fn(), getEmployees: jest.fn(),
        sales: [], purchase: [], expenses: [], accommodations: [],
        alert: '', alertState: '', alertTimeout: 0, actionMessage: '',
        setAlert: jest.fn(), setAlertState: jest.fn(), setAlertTimeout: jest.fn(), setActionMessage: jest.fn(),
        ...overrides,
    }
    render(<ContextProvider.Provider value={value}><Employees /></ContextProvider.Provider>)
    return { fetchServer, value }
}

const editSalary = (amount) => {
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    fireEvent.click(screen.getByRole('button', { name: 'HR Info' }))
    fireEvent.change(screen.getByPlaceholderText('Salary'), { target: { value: amount } })
}

const updatesSent = (fetchServer) => fetchServer.mock.calls.filter(([, , endpoint]) => endpoint === 'updateOneDoc').map(([, body]) => body)

test('a changed salary is sent and reported as saved', async () => {
    const { fetchServer, value } = mount()
    editSalary('65000')
    fireEvent.click(screen.getByRole('button', { name: 'Save Employee' }))
    await waitFor(() => expect(updatesSent(fetchServer)).toHaveLength(1))
    const [body] = updatesSent(fetchServer)
    expect(body.prop[0]).toEqual({ i_d: 'EMP-7' })
    expect(body.prop[1].salary).toBe('65000')
    // The database id can never be part of a change.
    expect(body.prop[1]).not.toHaveProperty('_id')
    await waitFor(() => expect(value.setAlert).toHaveBeenCalledWith('Employee Details Updated Successfully!'))
})

test('saving again after Discard still leaves the database id out', async () => {
    const { fetchServer } = mount()
    editSalary('70000')
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }))
    editSalary('71000')
    fireEvent.click(screen.getByRole('button', { name: 'Save Employee' }))
    await waitFor(() => expect(updatesSent(fetchServer)).toHaveLength(1))
    expect(updatesSent(fetchServer)[0].prop[1]).not.toHaveProperty('_id')
    expect(updatesSent(fetchServer)[0].prop[1].salary).toBe('71000')
})

test('a save the server did not apply is not reported as a success', async () => {
    const { value } = mount({ fetchServer: jest.fn(async () => ({ ok: true, err: false, updated: false })) })
    editSalary('80000')
    fireEvent.click(screen.getByRole('button', { name: 'Save Employee' }))
    await waitFor(() => expect(value.setAlertState).toHaveBeenCalledWith('error'))
    expect(value.setAlert).toHaveBeenCalledWith(expect.stringContaining('No employee record with ID EMP-7 was found'))
    expect(value.setAlert).not.toHaveBeenCalledWith('Employee Details Updated Successfully!')
})

test('a refused save shows the reason the server gave', async () => {
    const { value } = mount({ fetchServer: jest.fn(async () => ({ err: true, status: 500, mess: 'The change was not saved: write conflict' })) })
    editSalary('90000')
    fireEvent.click(screen.getByRole('button', { name: 'Save Employee' }))
    await waitFor(() => expect(value.setAlert).toHaveBeenCalledWith('The change was not saved: write conflict'))
})

test('after a save the list is read again from the server, not the old cached copy', async () => {
    const { value } = mount()
    editSalary('65000')
    fireEvent.click(screen.getByRole('button', { name: 'Save Employee' }))
    await waitFor(() => expect(value.getEmployees).toHaveBeenCalledWith('demo', null, false, true))
})
