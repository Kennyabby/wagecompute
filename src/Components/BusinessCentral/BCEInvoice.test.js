import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import BCEInvoice from './BCEInvoice'
import { rowsToInvoices, printInvoice } from './bcEinvFiles'

// The PDF and spreadsheet libraries need browser features the test
// environment lacks. What is drawn is recorded instead. Plain functions are
// used because the test runner clears mock implementations between tests.
const mockDrawn = []
jest.mock('jspdf', () => ({
    jsPDF: function MockPdf() {
        const pdf = { internal: { pageSize: { getWidth: () => 595, getHeight: () => 842 } }, lastAutoTable: { finalY: 300 } }
        ;['setFont', 'setFontSize', 'setDrawColor', 'line', 'addPage'].forEach((name) => { pdf[name] = () => pdf })
        pdf.text = (text) => { mockDrawn.push(['text', String(text)]); return pdf }
        pdf.addImage = (image) => { mockDrawn.push(['image', image]); return pdf }
        pdf.save = (name) => { mockDrawn.push(['save', name]); return pdf }
        return pdf
    },
}))
jest.mock('jspdf-autotable', () => ({ __esModule: true, default: (pdf, options) => { mockDrawn.push(['table', options.body]) } }))

const count = (n, total = 0) => ({ count: n, total })
const COUNTS = { needsAttention: count(1, 21500), ready: count(2, 215000), sending: count(0), signed: count(5, 900000), rejected: count(0), failed: count(0), excluded: count(0) }
const SETTINGS = { environment: 'test', baseUrl: 'https://nrs.example', serviceId: '94ND90NR', businessId: 'bb99', startDate: '2026-10-01', defaultKind: 'B2B', apiKeySet: true, apiSecretSet: true, publicKeySet: true, certificateSet: true, seller: { name: 'Mock Water Factory', tin: '87654321-0001' } }

const DOCS = {
    needsAttention: [{ id: 'bc:connection|invoice|PSI-0002', docType: 'invoice', documentNo: 'PSI-0002', issueDate: '2026-10-06', buyerRef: 'C002', buyerName: 'Beta Supermarket', currency: 'NGN', total: 21500, status: 'needsAttention', issues: [{ code: 'buyer', field: 'buyer.tin', message: 'Customer C002 has no TIN.' }, { code: 'item', field: 'lines.0.hsCode', message: 'Line 1 has no HS code.' }] }],
    ready: [
        { id: 'bc:connection|invoice|PSI-0003', docType: 'invoice', documentNo: 'PSI-0003', issueDate: '2026-10-08', buyerRef: 'C001', buyerName: 'Alpha Stores', currency: 'NGN', total: 107500, status: 'ready', issues: [] },
        { id: 'bc:connection|creditNote|PSCM-0001', docType: 'creditNote', documentNo: 'PSCM-0001', issueDate: '2026-10-07', buyerRef: 'C001', buyerName: 'Alpha Stores', currency: 'NGN', total: 5375, status: 'ready', issues: [] },
    ],
}

// The server, reduced to what the screens ask of it. Every call is kept.
const makeApi = (overrides = {}) => {
    const calls = []
    const note = (name, answer) => jest.fn(async (...args) => { calls.push([name, ...args]); return typeof answer === 'function' ? answer(...args) : answer })
    const api = {
        einvOverview: note('overview', { ok: true, settings: SETTINGS, gaps: [], secretsConfigured: true, counts: COUNTS }),
        einvDocuments: note('documents', (query) => ({ ok: true, documents: DOCS[query.status] || [], total: (DOCS[query.status] || []).length, page: 1, pageSize: 50, counts: COUNTS })),
        einvDocument: note('document', { ok: true, qrImage: null, seller: { name: 'Mock Water Factory' }, document: { ...DOCS.ready[0], irn: 'PSI0003-94ND90NR-20261008', tax: 7500, payload: { irn: 'PSI0003-94ND90NR-20261008' }, invoice: { lines: [{ itemRef: 'FG-75CL', name: 'Bottled water 75cl', quantity: 2000, unitSource: 'PCS', unitPrice: 50, lineAmount: 100000, vatAmount: 7500 }] } }, attempts: [] }),
        einvSend: note('send', { ok: true, tally: { signed: 1, rejected: 1, failed: 0, skipped: 0, stoppedForKeys: false }, counts: COUNTS }),
        einvExclude: note('exclude', { ok: true, changed: 1, counts: COUNTS }),
        einvFetch: note('fetch', { ok: true, from: '2026-10-01', to: '2026-10-12', tally: { read: 4, staged: 1, updated: 3, alreadyHere: 20 }, counts: COUNTS }),
        einvLive: note('live', { ok: true, live: { reading: false, error: '', lastFetch: { at: Date.now() - 20000 }, history: { complete: false, earliest: '2021-03-02', next: '2025-06', read: 4000 } }, counts: COUNTS }),
        einvImport: note('import', { ok: true, tally: { staged: 1, updated: 0, untouched: 0 }, refused: [], counts: COUNTS }),
        einvPayment: note('payment', { ok: true, outcome: 'paid' }),
        einvStamps: note('stamps', { ok: true, tally: { written: 3, failed: 0 } }),
        einvCreateKey: note('createKey', { ok: true, key: 'einv_ab12cd34_secretsecretsecretsecret', id: 'ab12cd34', name: 'Odoo' }),
        einvRemoveKey: note('removeKey', { ok: true, removed: true }),
        einvGaps: note('gaps', { ok: true, gaps: [{ kind: 'customer', key: 'C002', label: 'Beta Supermarket', fields: ['tin', 'state'], documents: 4 }, { kind: 'unit', key: 'PK12', label: 'PK12', fields: ['code'], documents: 9 }] }),
        einvSaveMappings: note('saveMappings', { ok: true, saved: 1, counts: { ...COUNTS, ready: count(6) } }),
        einvSaveSettings: note('saveSettings', { ok: true, settings: SETTINGS, gaps: [] }),
        einvTestKeys: note('test', { ok: true, invoiceTypes: [1, 2, 3] }),
        einvSource: note('source', { ok: true, pages: { units: { published: [], expected: ['UnitsOfMeasure'], missingFields: ['code'] } }, seller: { name: 'From BC', city: 'Port Harcourt' } }),
        einvLog: note('log', { ok: true, log: [] }),
        ...overrides,
    }
    return { api, calls }
}

// Where the reader is lives in the address, so each test starts on a clean one.
beforeEach(() => { window.history.replaceState(null, '', '/business-central') })

const mount = (api, canManage = true) => {
    const alerts = []
    render(<BCEInvoice api={api} canManage={canManage} notify={(type, message) => alerts.push([type, message])} />)
    return alerts
}

test('documents are listed by status with the reason each one is waiting', async () => {
    const { api } = makeApi()
    mount(api)
    const tabs = within(await screen.findByRole('navigation', { name: 'Documents by status' }))
    expect(tabs.getByRole('button', { name: 'Needs attention (1)' })).toHaveAttribute('aria-current', 'page')
    expect(await screen.findByText('Customer C002 has no TIN. (and 1 more)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send all ready (2)' })).toBeEnabled()

    fireEvent.click(tabs.getByRole('button', { name: 'Ready to send (2)' }))
    expect(await screen.findByText('PSCM-0001')).toBeInTheDocument()
    expect(screen.getByText('(credit note)', { exact: false })).toBeInTheDocument()
})

test('chosen documents are sent by their ids and the outcome is reported', async () => {
    const { api, calls } = makeApi()
    const alerts = mount(api)
    fireEvent.click(within(await screen.findByRole('navigation', { name: 'Documents by status' })).getByRole('button', { name: 'Ready to send (2)' }))
    fireEvent.click(await screen.findByLabelText('Select PSI-0003'))
    fireEvent.click(screen.getByRole('button', { name: 'Send 1 selected' }))
    await waitFor(() => expect(calls.some(([name]) => name === 'send')).toBe(true))
    expect(calls.find(([name]) => name === 'send')[1]).toEqual(['bc:connection|invoice|PSI-0003'])
    await waitFor(() => expect(alerts).toContainEqual(['success', '1 cleared, 1 rejected.']))
})

test('the list fills from Business Central by itself, and the dates only choose what is shown', async () => {
    const { api, calls } = makeApi()
    const alerts = mount(api)
    // The page asks the server to look at the ERP without anyone pressing anything.
    await waitFor(() => expect(calls.some(([name]) => name === 'live')).toBe(true))
    expect(await screen.findByText(/Live from Business Central\. Last checked/)).toBeInTheDocument()
    expect(screen.getByText(/Older invoices are still arriving: read back to 2025-06 so far, of history that begins 2021-03-02/)).toBeInTheDocument()

    // Changing the period asks for another slice of what is stored. It does not read the ERP.
    fireEvent.change(screen.getByLabelText('Show posted from'), { target: { value: '2026-01-01' } })
    await waitFor(() => expect(calls.filter(([name]) => name === 'documents').pop()[1].from).toBe('2026-01-01'))
    fireEvent.click(screen.getByRole('button', { name: 'All dates' }))
    await waitFor(() => expect(calls.filter(([name]) => name === 'documents').pop()[1]).toMatchObject({ from: '', to: '' }))
    expect(calls.some(([name]) => name === 'fetch')).toBe(false)

    // Reading by hand is still there, as the alternative.
    fireEvent.click(screen.getByRole('button', { name: 'Read this period again now' }))
    await waitFor(() => expect(alerts).toContainEqual(['success', 'Read 2026-10-01 to 2026-10-12 again: 1 new, 3 brought up to date, 20 already cleared or left out.']))
})

test('a problem reading Business Central is shown, and the stored list still works', async () => {
    const { api } = makeApi({ einvLive: jest.fn(async () => ({ ok: true, live: { reading: false, error: 'Business Central rejected the username or password.', lastFetch: null, history: null }, counts: COUNTS })) })
    mount(api)
    expect(await screen.findByText(/could not be read just now, so this list may be behind: Business Central rejected/)).toBeInTheDocument()
    expect(await screen.findByText('PSI-0002')).toBeInTheDocument()
})

test('a gap is fixed once for every document it holds up', async () => {
    const { api, calls } = makeApi()
    const alerts = mount(api)
    fireEvent.click(await screen.findByRole('button', { name: 'Fix what is missing (1)' }))
    expect(await screen.findByText('holds up 4 documents')).toBeInTheDocument()
    expect(screen.getByText('TIN (missing)')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('TIN for C002'), { target: { value: '12345678-0001' } })
    fireEvent.change(screen.getByLabelText('State code for C002'), { target: { value: 'NG-RI' } })
    const row = screen.getByLabelText('TIN for C002').closest('.bc-einv-gap') // eslint-disable-line testing-library/no-node-access
    fireEvent.click(within(row).getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(calls.some(([name]) => name === 'saveMappings')).toBe(true))
    expect(calls.find(([name]) => name === 'saveMappings')[1]).toEqual([{ kind: 'customer', key: 'C002', label: 'Beta Supermarket', values: { tin: '12345678-0001', state: 'NG-RI' } }])
    await waitFor(() => expect(alerts).toContainEqual(['success', 'Saved. 6 document(s) are now ready to send.']))
})

test('before setup the list still fills, and setup has the steps for getting keys without sending stored keys back', async () => {
    const { api, calls } = makeApi({ einvOverview: jest.fn(async () => ({ ok: true, settings: null, gaps: ['The NRS keys have not been entered.'], secretsConfigured: true, counts: COUNTS })) })
    mount(api)
    expect(await screen.findByText(/Invoices are being read from Business Central, but nothing can be sent to NRS yet/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send all ready (2)' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Open setup' }))
    expect(await screen.findByText('How to get your NRS keys')).toBeInTheDocument()
    expect(screen.getByText(/Sign in at einvoice.nrs.gov.ng/)).toBeInTheDocument()
    fireEvent.change(screen.getByPlaceholderText('8 letters and digits'), { target: { value: '94ND90NR' } })
    fireEvent.click(screen.getByRole('button', { name: 'Check Business Central pages' }))
    expect(await screen.findByText('Not published (UnitsOfMeasure)')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Fill blanks from Company Information' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(calls.some(([name]) => name === 'saveSettings')).toBe(true))
    const sent = calls.find(([name]) => name === 'saveSettings')[1]
    expect(sent.serviceId).toBe('94ND90NR')
    expect(sent.seller).toEqual({ name: 'From BC', city: 'Port Harcourt' })
    expect([sent.apiKey, sent.apiSecret, sent.publicKey, sent.certificate]).toEqual(['', '', '', ''])
    // Reading is on unless switched off. Sending by itself is off until chosen.
    expect([sent.autoFetch, sent.autoSend, sent.syncPayments, sent.writeBack]).toEqual([true, false, false, false])
})

test('a key for another system is shown once when it is made', async () => {
    const { api, calls } = makeApi()
    mount(api)
    fireEvent.click(await screen.findByRole('button', { name: 'Setup' }))
    fireEvent.change(await screen.findByPlaceholderText('For example Odoo'), { target: { value: 'Odoo' } })
    fireEvent.click(screen.getByRole('button', { name: 'Make a key' }))
    expect(await screen.findByText('einv_ab12cd34_secretsecretsecretsecret')).toBeInTheDocument()
    expect(calls.find(([name]) => name === 'createKey')[1]).toBe('Odoo')
})

test('an invoice can be typed in, and goes to the same staging as the rest', async () => {
    const { api, calls } = makeApi()
    const alerts = mount(api)
    fireEvent.click(await screen.findByRole('button', { name: 'Add invoices' }))
    const add = screen.getByRole('button', { name: 'Add this invoice' })
    expect(add).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Document number'), { target: { value: 'M-1' } })
    fireEvent.change(screen.getByLabelText('Customer name'), { target: { value: 'Gamma Traders' } })
    fireEvent.change(screen.getByLabelText('Quantity, line 1'), { target: { value: '10' } })
    fireEvent.change(screen.getByLabelText('Unit price, line 1'), { target: { value: '1000' } })
    fireEvent.click(add)
    await waitFor(() => expect(calls.some(([name]) => name === 'import')).toBe(true))
    const [, source, documents] = calls.find(([name]) => name === 'import')
    expect(source).toBe('manual')
    expect(documents[0]).toMatchObject({ documentNo: 'M-1', docType: 'invoice', buyer: { name: 'Gamma Traders' }, lines: [{ quantity: 10, unitPrice: 1000, vatPercent: 7.5, unit: 'EA' }] })
    await waitFor(() => expect(alerts).toContainEqual(['success', '1 added, 0 updated, 0 already cleared or left out.']))
})

test('spreadsheet rows become invoices, grouped by number, with columns in any order', () => {
    const rows = [
        ['Our invoices for October'],
        ['Date', 'Document No', 'Type', 'Customer Name', 'Customer TIN', 'Description', 'Quantity', 'Unit Price', 'VAT %', 'Original Invoice No', 'Something else'],
        ['12/10/2026', 'INV-1', 'Invoice', 'Alpha Stores', '12345678-0001', 'Water 75cl', '2,000', '50.00', 7.5, '', 'ignored'],
        ['12/10/2026', 'INV-1', 'Invoice', '', '', 'Dispenser', 20, 700, 0, '', ''],
        ['13/10/2026', 'CN-1', 'Credit Note', 'Alpha Stores', '12345678-0001', 'Water 75cl', 100, 50, '', 'INV-1', ''],
        ['not a date', 'INV-2', 'Invoice', 'Beta', '', 'Water', 1, 1, 7.5, '', ''],
        ['', '', '', '', '', '', '', '', '', '', ''],
    ]
    const { invoices, problems } = rowsToInvoices(rows)
    expect(invoices.map((invoice) => [invoice.documentNo, invoice.docType, invoice.issueDate, invoice.lines.length])).toEqual([['INV-1', 'invoice', '2026-10-12', 2], ['CN-1', 'creditNote', '2026-10-13', 1]])
    expect(invoices[0].buyer).toMatchObject({ name: 'Alpha Stores', tin: '12345678-0001' })
    expect(invoices[0].lines.map((line) => [line.quantity, line.unitPrice, line.vatPercent])).toEqual([[2000, 50, 7.5], [20, 700, 0]])
    // A blank VAT cell is "not stated", which is not the same as 0%.
    expect('vatPercent' in invoices[1].lines[0]).toBe(false)
    expect(invoices[1].originalDocumentNo).toBe('INV-1')
    expect(problems).toEqual(['Row 6: INV-2 has no readable date.'])
    expect(rowsToInvoices([['Name', 'Amount']]).problems[0]).toMatch(/No "Document No" heading/)
})

test('the printed invoice carries the reference and QR code once cleared, and says draft before', () => {
    const seller = { name: 'Mock Water Factory', tin: '87654321-0001', street: '1 Factory Lane', city: 'Port Harcourt' }
    const base = { documentNo: 'PSI-0003', docType: 'invoice', issueDate: '2026-10-08', currency: 'NGN', total: 107500, tax: 7500, buyerName: 'Alpha Stores', irn: 'PSI0003-94ND90NR-20261008', invoice: { lines: [{ itemRef: 'FG-75CL', name: 'Bottled water 75cl', quantity: 2000, unitSource: 'PCS', unitPrice: 50, lineAmount: 100000, vatAmount: 7500 }] } }
    mockDrawn.length = 0
    printInvoice({ document: { ...base, status: 'signed', signedAt: Date.UTC(2026, 9, 8, 10, 30) }, seller, qrImage: 'data:image/png;base64,AAAA' })
    const texts = () => mockDrawn.filter(([kind]) => kind === 'text').map(([, text]) => text)
    expect(texts()).toEqual(expect.arrayContaining(['TAX INVOICE', 'Invoice reference (IRN): PSI0003-94ND90NR-20261008', 'Cleared on 2026-10-08 10:30 UTC', '107,500.00']))
    expect(mockDrawn).toContainEqual(['image', 'data:image/png;base64,AAAA'])
    expect(mockDrawn.find(([kind]) => kind === 'table')[1]).toEqual([['FG-75CL', 'Bottled water 75cl', '2,000', 'PCS', '50.00', '100,000.00', '7,500.00']])
    expect(mockDrawn).toContainEqual(['save', 'PSI-0003.pdf'])

    mockDrawn.length = 0
    printInvoice({ document: { ...base, status: 'ready' }, seller, qrImage: null })
    expect(texts()).toContain('TAX INVOICE (DRAFT)')
    expect(texts().some((text) => /has not been cleared/.test(text))).toBe(true)
    expect(mockDrawn.some(([kind]) => kind === 'image')).toBe(false)
})

test('the section and the status tab are kept in the address, so a refresh lands on them', async () => {
    window.history.replaceState(null, '', '/business-central?tab=einvoice&section=invoices&status=ready')
    const { api, calls } = makeApi()
    mount(api)
    const tabs = within(await screen.findByRole('navigation', { name: 'Documents by status' }))
    expect(tabs.getByRole('button', { name: 'Ready to send (2)' })).toHaveAttribute('aria-current', 'page')
    await waitFor(() => expect(calls.filter(([name]) => name === 'documents').pop()[1].status).toBe('ready'))
    fireEvent.click(tabs.getByRole('button', { name: 'Rejected by NRS (0)' }))
    expect(window.location.search).toBe('?tab=einvoice&section=invoices&status=rejected')
    // Leaving the list drops its status tab, and keeps the module tab.
    fireEvent.click(screen.getByRole('button', { name: 'Activity' }))
    expect(window.location.search).toBe('?tab=einvoice&section=activity')
})

test('a refresh on a section other than the list opens that section', async () => {
    window.history.replaceState(null, '', '/business-central?tab=einvoice&section=mapping')
    const { api } = makeApi()
    mount(api)
    expect(await screen.findByText('holds up 4 documents')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fix what is missing (1)' })).toHaveAttribute('aria-current', 'page')
})

test('someone who is not an admin sees no setup section', async () => {
    const { api } = makeApi()
    mount(api, false)
    await screen.findByRole('navigation', { name: 'E-invoicing sections' })
    expect(screen.queryByRole('button', { name: 'Setup' })).not.toBeInTheDocument()
})

test('a document opens with its lines, its reference and what can be done with it', async () => {
    const { api, calls } = makeApi()
    mount(api)
    fireEvent.click(within(await screen.findByRole('navigation', { name: 'Documents by status' })).getByRole('button', { name: 'Ready to send (2)' }))
    fireEvent.click(await screen.findByRole('button', { name: 'PSI-0003' }))
    const dialog = within(await screen.findByRole('dialog', { name: 'Invoice PSI-0003' }))
    expect(await dialog.findByText('PSI0003-94ND90NR-20261008')).toBeInTheDocument()
    expect(dialog.getByText('Bottled water 75cl')).toBeInTheDocument()
    expect(dialog.getByText('Nothing has been sent for this document yet.')).toBeInTheDocument()
    fireEvent.click(dialog.getByRole('button', { name: 'Send to NRS' }))
    await waitFor(() => expect(calls.some(([name]) => name === 'send')).toBe(true))
})
