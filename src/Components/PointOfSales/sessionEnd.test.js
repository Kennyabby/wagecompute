import { reconciliationAllowsEnd, reconciliationGap } from './PointOfSales'

jest.mock('../../Resources/offlineDb', () => ({}))
jest.mock('../../Resources/offlineSync', () => ({}))
jest.mock('./SessionManagerReconcile', () => () => null)
// Pulls in the PDF library, which the test browser cannot load and these tests do not use.
jest.mock('../Shared/TransactionReports/TransactionReports', () => () => null)

const settings = [{ name: 'posReconciliation', enabled: true, locations: ['bar1', 'kitchen'] }]
const session = { start: Date.UTC(2026, 10, 10, 9) }
const formatDateToDefault = () => '2026-11-10'
const answer = (resp) => jest.fn(async () => resp)

const ask = (fetchServer, { isAdmin = false, list = settings } = {}) => {
    const say = jest.fn()
    return { say, result: reconciliationAllowsEnd({ settings: list, fetchServer, server: '', formatDateToDefault, session }, { isAdmin, say }) }
}

afterEach(() => jest.restoreAllMocks())

test('a session cannot end while a required location has no closing stock', async () => {
    const { say, result } = ask(answer({ exists: true, record: { locations: [{ location: 'bar1' }] } }))
    await expect(result).resolves.toBe(false)
    expect(say).toHaveBeenCalledWith(expect.stringContaining('Still missing for 2026-11-10: kitchen.'))
})

test('nothing saved for the day says so', async () => {
    const { say, result } = ask(answer({ exists: false, record: null }))
    await expect(result).resolves.toBe(false)
    expect(say).toHaveBeenCalledWith(expect.stringContaining('Nothing saved yet for 2026-11-10.'))
})

test('every required location counted lets the session end', async () => {
    const { say, result } = ask(answer({ exists: true, record: { locations: [{ location: 'bar1' }, { location: 'kitchen' }] } }))
    await expect(result).resolves.toBe(true)
    expect(say).not.toHaveBeenCalled()
})

test('with reconciliation switched off nothing is asked', async () => {
    const fetchServer = jest.fn()
    const { result } = ask(fetchServer, { list: [{ name: 'posReconciliation', enabled: false, locations: ['bar1'] }] })
    await expect(result).resolves.toBe(true)
    expect(fetchServer).not.toHaveBeenCalled()
})

test('when the server cannot be asked, a user who is not admin is held back', async () => {
    const fetchServer = answer({ err: true, mess: 'Could not connect to server.' })
    const { say, result } = ask(fetchServer)
    await expect(result).resolves.toBe(false)
    expect(fetchServer).toHaveBeenCalledTimes(2)
    expect(say).toHaveBeenCalledWith(expect.stringContaining('so the session was not ended'))
})

test('when the server cannot be asked, an admin may go ahead after confirming', async () => {
    const confirm = jest.spyOn(window, 'confirm').mockReturnValue(true)
    const { result } = ask(answer({ err: true, mess: 'down' }), { isAdmin: true })
    await expect(result).resolves.toBe(true)
    expect(confirm).toHaveBeenCalled()
})

test('the gap lists only the locations still missing', async () => {
    await expect(reconciliationGap({ settings, fetchServer: answer({ exists: true, record: { locations: [{ location: 'kitchen' }] } }), server: '', formatDateToDefault, session }))
        .resolves.toEqual({ missing: ['bar1'], postingDate: '2026-11-10', nothingSaved: false })
})
