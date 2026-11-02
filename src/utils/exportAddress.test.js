import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import ContextProvider from '../Resources/ContextProvider'
import ExportAddressPrompt from '../Components/Shared/ExportAddressPrompt'
import { addressForFilters, bindAddressPrompt, letterheadFor, setAddressProfile, whereFromDefinition, whereFromFilters, withReportAddress } from './exportAddress'

const company = {
    address: '1 Head Office Road', city: 'Port Harcourt', state: 'Rivers', country: 'Nigeria', phone: '0800', email: 'head@example.com',
    reportAddresses: [
        { id: 'a', label: 'Transamadi', address: '5 Transamadi Road', phone: '0801', email: '', branches: ['PHC'], locations: ['WH-TM', 'WH-TM2'] },
        { id: 'b', label: 'Aba', address: '9 Aba Road', phone: '', email: 'aba@example.com', branches: ['ABA'], locations: ['WH-AB'] },
    ],
}

afterEach(() => { bindAddressPrompt(null); setAddressProfile(null) })

describe('which address the filters settle on', () => {
    test('a branch takes its address, ahead of a location that points elsewhere', () => {
        expect(addressForFilters(company, { branch: ['ABA'], location: ['WH-TM'] }).id).toBe('b')
    })
    test('a location is used when no branch is chosen, whatever the case of the code', () => {
        expect(addressForFilters(company, { location: 'wh-tm' }).id).toBe('a')
    })
    test('a branch with no link falls to its location', () => {
        expect(addressForFilters(company, { branch: ['OTHER'], location: ['WH-AB'] }).id).toBe('b')
    })
    test('several values count when they share an address, and not when they differ', () => {
        expect(addressForFilters(company, { location: ['WH-TM', 'WH-TM2'] }).id).toBe('a')
        expect(addressForFilters(company, { location: ['WH-TM', 'WH-AB'] })).toBeNull()
        expect(addressForFilters(company, { location: ['WH-TM', 'UNKNOWN'] })).toBeNull()
    })
    test('no filter settles nothing, and "all" is no filter', () => {
        expect(addressForFilters(company, {})).toBeNull()
        expect(addressForFilters(company, { location: 'all' })).toBeNull()
    })
})

describe('reading filters', () => {
    test('finds branch and location by key or label, and leaves lookalikes alone', () => {
        expect(whereFromFilters({ branches: ['PHC'], Location: 'WH, WH-TM', warehouse: 'Main', Allocation: 'x', category: 'y' }))
            .toEqual({ branch: ['PHC'], location: ['WH', 'WH-TM', 'Main'] })
    })
    test('a built report is read by the label of its numbered parameter', () => {
        const definition = { filters: [{ key: 'p0', label: 'Location code' }, { key: 'p1', label: 'Item' }] }
        expect(whereFromDefinition(definition, { p0: ['DEPOT'], p1: ['X'] })).toEqual({ branch: [], location: ['DEPOT'] })
    })
})

// A real page with the real prompt on it.
const mount = (profile) => {
    const fetchServer = jest.fn(async () => ({ record: profile }))
    render(<ContextProvider.Provider value={{ centralCompany: profile, fetchServer, server: '' }}><ExportAddressPrompt /></ContextProvider.Provider>)
}

describe('the letterhead an export prints', () => {
    const base = { name: 'Demo', address: 'Old address', phone: '111', email: 'old@example.com' }

    test('a linked filter is used without asking, keeping the company contact where the address has none', async () => {
        mount(company)
        const head = await letterheadFor(base, { location: ['WH-TM'] }, 'Stock')
        expect(head).toMatchObject({ name: 'Demo', address: '5 Transamadi Road', phone: '0801', email: 'old@example.com' })
        expect(screen.queryByRole('dialog')).toBeNull()
    })

    test('with nothing settled it asks first, and prints the choice', async () => {
        mount(company)
        const answer = letterheadFor(base, {}, 'Stock')
        fireEvent.click(await screen.findByLabelText(/Aba/))
        fireEvent.click(screen.getByRole('button', { name: 'Use this address' }))
        await expect(answer).resolves.toMatchObject({ address: '9 Aba Road', email: 'aba@example.com' })
    })

    test('the company profile address is on the list', async () => {
        mount(company)
        const answer = letterheadFor(base, {}, 'Stock')
        fireEvent.click(await screen.findByLabelText(/Company address/))
        expect(screen.getByText('1 Head Office Road, Port Harcourt, Rivers, Nigeria')).toBeTruthy()
        fireEvent.click(screen.getByRole('button', { name: 'Use this address' }))
        await expect(answer).resolves.toMatchObject({ address: '1 Head Office Road, Port Harcourt, Rivers, Nigeria', phone: '0800' })
    })

    test('cancelling stops the export', async () => {
        mount(company)
        const answer = letterheadFor(base, { location: ['WH-TM', 'WH-AB'] }, 'Stock')
        expect(await screen.findByText(/location WH-TM, WH-AB/)).toBeTruthy()
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
        await expect(answer).resolves.toBeNull()
    })

    test('with no address saved anywhere it can still go on, showing none', async () => {
        mount({ reportAddresses: [] })
        const answer = letterheadFor(base, {}, 'Stock')
        fireEvent.click(await screen.findByRole('button', { name: 'Export without an address' }))
        await expect(answer).resolves.toMatchObject({ address: '' })
    })

    test('a link another admin saved since the page loaded is used', async () => {
        const fetchServer = jest.fn(async () => ({ record: company }))
        render(<ContextProvider.Provider value={{ centralCompany: { reportAddresses: [] }, fetchServer, server: '' }}><ExportAddressPrompt /></ContextProvider.Provider>)
        await waitFor(() => expect(fetchServer).not.toHaveBeenCalled())
        await expect(letterheadFor(base, { branch: 'PHC' }, 'Stock')).resolves.toMatchObject({ address: '5 Transamadi Road' })
    })
})

describe('a PDF drawn from the screen', () => {
    test('shows the chosen address only while the file is made, and gives the page back as it was', async () => {
        mount(company)
        const page = document.createElement('div')
        page.innerHTML = '<p data-report-address>Address: old</p><p data-report-address style="display: none"></p><p data-report-email>Email: old</p>'
        const [shown, hidden] = page.querySelectorAll('[data-report-address]')
        const originalText = shown.firstChild
        let during = null
        await act(async () => {
            await withReportAddress(page, { location: 'WH-AB' }, 'Report', async () => {
                during = [shown.textContent, hidden.textContent, hidden.style.display, page.querySelector('[data-report-email]').textContent]
            })
        })
        expect(during).toEqual(['Address: 9 Aba Road', 'Address: 9 Aba Road', '', 'Email: aba@example.com'])
        // The same text node, because React still holds on to it.
        expect(shown.firstChild).toBe(originalText)
        expect(hidden.style.display).toBe('none')
        expect(hidden.textContent).toBe('')
    })

    test('a receipt with phone and email on one line takes each from the address, or keeps its own', async () => {
        mount(company)
        const page = document.createElement('div')
        page.innerHTML = '<p data-report-contact data-contact-phone="111" data-contact-email="own@example.com">Phone: 111, Email: own@example.com</p>'
        let during = ''
        await act(async () => { await withReportAddress(page, { location: 'WH-TM' }, 'Receipt', async () => { during = page.textContent }) })
        expect(during).toBe('Phone: 0801, Email: own@example.com')
        expect(page.textContent).toBe('Phone: 111, Email: own@example.com')
    })

    test('a cancel makes no file', async () => {
        mount(company)
        const page = document.createElement('div')
        const made = jest.fn()
        const finished = withReportAddress(page, {}, 'Report', made)
        fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }))
        await expect(finished).resolves.toBe(false)
        expect(made).not.toHaveBeenCalled()
    })
})
