import { act, fireEvent, render, screen } from '@testing-library/react'
import BCDashboard from './BCDashboard'
import BCFilterBar from './BCFilterBar'

// The chart library measures its container, which the test environment has
// no way to do.
global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} }

const dashboard = {
    comparedWith: { days: 30 },
    kpis: [
        { key: 'sales', label: 'Sales', value: 450000, format: 'money', link: { report: 'salesAnalysis', params: { from: '2026-09-01', to: '2026-09-30', branches: ['NORTH'] } } },
        { key: 'plain', label: 'No report behind this', value: 1, format: 'number' },
    ],
    charts: [],
    lists: { lowStock: [], idleStock: [] },
}

test('a dashboard tile opens the report behind it with the dashboard filters', async () => {
    const onOpenReport = jest.fn()
    const api = { getDashboard: jest.fn().mockResolvedValue({ dashboard }) }
    render(<BCDashboard api={api} lookups={{ hasBranch: true, locations: [], branches: [] }} live onOpenReport={onOpenReport} />)

    fireEvent.click(await screen.findByRole('button', { name: /Sales/ }))
    expect(onOpenReport).toHaveBeenCalledWith('salesAnalysis', { from: '2026-09-01', to: '2026-09-30', branches: ['NORTH'] })
    // A figure with no report to open is shown as a plain tile.
    expect(screen.queryByRole('button', { name: /No report behind this/ })).toBeNull()
    expect(screen.getByText('No report behind this')).toBeInTheDocument()
})

test('a filter with nothing to choose from is left off, once the lists have loaded', () => {
    const filters = [
        { key: 'customers', type: 'multi', label: 'Customer', lookup: 'customers' },
        { key: 'salespeople', type: 'multi', label: 'Salesperson', lookup: 'salespeople', optional: true },
    ]
    const values = { customers: [], salespeople: [] }
    const { rerender } = render(<BCFilterBar filters={filters} values={values} onChange={() => {}} lookups={null} onSubmit={() => {}} />)
    // Before the lists arrive nothing is known, so nothing is hidden.
    expect(screen.getByText('Salesperson')).toBeInTheDocument()

    rerender(<BCFilterBar filters={filters} values={values} onChange={() => {}} lookups={{ customers: [{ value: 'C001', label: 'C001 - Alpha Stores' }], salespeople: [] }} onSubmit={() => {}} />)
    expect(screen.queryByText('Salesperson')).toBeNull()
    expect(screen.getByText('Customer')).toBeInTheDocument()

    rerender(<BCFilterBar filters={filters} values={values} onChange={() => {}} lookups={{ customers: [], salespeople: [{ value: 'SP1', label: 'SP1 - Ada Obi' }] }} onSubmit={() => {}} />)
    expect(screen.getByText('Salesperson')).toBeInTheDocument()
})

test('profit is shown step by step, with the working behind net profit', async () => {
    const onOpenReport = jest.fn()
    const financial = {
        revenue: 450000, cogs: 180000, grossProfit: 270000, expenses: 600, netProfit: 269400, grossMargin: 60, netMargin: 59.87, hasCostOfSales: true,
        change: {},
        link: { report: 'incomeStatement', params: { from: '2026-09-01', to: '2026-09-30' } },
        steps: [
            { kind: 'income', label: 'Revenue', amount: 450000, parts: [] },
            { kind: 'less', label: 'Cost of sales', amount: 180000, parts: [] },
            { kind: 'subtotal', label: 'Gross profit', amount: 270000, parts: [] },
            { kind: 'less', label: 'Costs', amount: 600, parts: [{ no: '6000', label: 'Rent', amount: 400 }, { no: '6100', label: 'Fuel', amount: 200 }] },
            { kind: 'total', label: 'Net profit', amount: 269400, parts: [] },
        ],
    }
    const api = { getDashboard: jest.fn().mockResolvedValue({ dashboard: { ...dashboard, financial, notes: ['2 item entries were posted with no branch and have been given one.'] } }) }
    render(<BCDashboard api={api} lookups={{ hasBranch: false, locations: [] }} live onOpenReport={onOpenReport} />)

    const cogs = await screen.findByRole('button', { name: /Cost of goods sold/ })
    expect(cogs).toHaveTextContent('180,000')
    expect(screen.getByRole('button', { name: /Total expenses/ })).toHaveTextContent('600')
    expect(screen.getByRole('button', { name: /Net profit/ })).toHaveTextContent('Margin 59.87%')
    expect(screen.getByText('2 item entries were posted with no branch and have been given one.')).toBeInTheDocument()

    // The working is one click away and lists what each step is made of.
    expect(screen.queryByText('Less: Cost of sales')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'How net profit was reached' }))
    expect(screen.getByText('Less: Cost of sales')).toBeInTheDocument()
    expect(screen.getByText('Gives: Gross profit')).toBeInTheDocument()
    expect(screen.getByText('Rent')).toBeInTheDocument()
    expect(screen.getByText('(180,000.00)')).toBeInTheDocument()

    fireEvent.click(cogs)
    expect(onOpenReport).toHaveBeenCalledWith('incomeStatement', { from: '2026-09-01', to: '2026-09-30' })
})

test('monthly performance shows a year as a chart and a table, and another year on a click', async () => {
    const monthly = {
        year: '2026',
        years: ['2026', '2025'],
        rows: [
            { month: '2026-09', revenue: 450000, cogs: 180000, grossProfit: 270000, expenses: 600, netProfit: 269400 },
            { month: '2026-10', revenue: 5600, cogs: 3000, grossProfit: 2600, expenses: 0, netProfit: 2600 },
        ],
    }
    const api = {
        getDashboard: jest.fn().mockResolvedValue({ dashboard: { ...dashboard, params: { branches: ['NORTH'] }, monthly } }),
        getMonthly: jest.fn().mockResolvedValue({ monthly: { year: '2025', rows: [{ month: '2025-12', revenue: 1000, cogs: 400, grossProfit: 600, expenses: 100, netProfit: 500 }] } }),
    }
    render(<BCDashboard api={api} lookups={{ hasBranch: true, locations: [], branches: [] }} live onOpenReport={() => {}} />)

    expect(await screen.findByRole('cell', { name: 'September 2026' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'Total for 2026' })).toBeInTheDocument()
    // Net profit for the year is the sum of its months.
    expect(screen.getByRole('cell', { name: '272,000.00' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '2026' })).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getByRole('button', { name: '2025' }))
    expect(await screen.findByRole('cell', { name: 'December 2025' })).toBeInTheDocument()
    // The other year keeps the dashboard's branch filter.
    expect(api.getMonthly).toHaveBeenCalledWith({ year: '2025', branches: ['NORTH'] })
    expect(screen.queryByRole('cell', { name: 'September 2026' })).toBeNull()
    expect(screen.getByRole('button', { name: '2025' })).toHaveAttribute('aria-pressed', 'true')

    // Back to the dashboard's own year without asking the server again.
    fireEvent.click(screen.getByRole('button', { name: '2026' }))
    expect(await screen.findByRole('cell', { name: 'September 2026' })).toBeInTheDocument()
    expect(api.getMonthly).toHaveBeenCalledTimes(1)
})

test('inventory adjustments get their own tile, which opens their breakdown, and a negative cost is explained', async () => {
    const onOpenReport = jest.fn()
    const financial = {
        revenue: 1000, cogs: 400, adjustments: -50, otherCosts: 0, grossProfit: 650, expenses: 80, netProfit: 570, grossMargin: 65, netMargin: 57,
        hasCostOfSales: true, hasAdjustments: true, hasOtherCosts: false, change: {},
        link: { report: 'incomeStatement', params: { from: '2026-10-01', to: '2026-10-10' } },
        adjustmentsLink: { report: 'ledgerAdjustments', params: { from: '2026-10-01', to: '2026-10-10', branches: ['TRANSAMADI'] } },
        steps: [
            { kind: 'income', label: 'Revenue', amount: 1000, signed: 1000, parts: [] },
            { kind: 'less', label: 'Cost of goods sold', amount: 400, signed: 400, parts: [] },
            { kind: 'less', label: 'Inventory adjustments', amount: -50, signed: -50, parts: [] },
            { kind: 'subtotal', label: 'Gross profit', amount: 650, signed: 650, parts: [] },
            { kind: 'less', label: 'Expense', amount: 80, signed: 80, parts: [] },
            { kind: 'total', label: 'Net profit', amount: 570, signed: 570, parts: [] },
        ],
    }
    const api = { getDashboard: jest.fn().mockResolvedValue({ dashboard: { ...dashboard, financial } }) }
    render(<BCDashboard api={api} lookups={{ hasBranch: false, locations: [] }} live onOpenReport={onOpenReport} />)

    const tile = await screen.findByRole('button', { name: /Inventory adjustments/ })
    expect(tile).toHaveTextContent('-50')
    expect(tile).toHaveTextContent('A net credit: it adds to profit.')
    // A kind of cost this chart does not have gets no tile.
    expect(screen.queryByRole('button', { name: /Other costs/ })).toBeNull()
    fireEvent.click(tile)
    expect(onOpenReport).toHaveBeenCalledWith('ledgerAdjustments', { from: '2026-10-01', to: '2026-10-10', branches: ['TRANSAMADI'] })

    // In the working, a cost is in brackets and a credit carries a plus.
    fireEvent.click(screen.getByRole('button', { name: 'How net profit was reached' }))
    expect(screen.getByText('(400.00)')).toBeInTheDocument()
    expect(screen.getByText('+50.00')).toBeInTheDocument()
})

test('a kept answer is shown at once and replaced when the fresh one arrives', async () => {
    jest.useFakeTimers()
    const kept = { ...dashboard, kpis: [{ key: 'sales', label: 'Sales kept', value: 1, format: 'money' }] }
    const fresh = { ...dashboard, kpis: [{ key: 'sales', label: 'Sales fresh', value: 2, format: 'money' }] }
    const api = { getDashboard: jest.fn().mockResolvedValueOnce({ dashboard: kept, stale: true, cachedAt: Date.now() - 600000 }).mockResolvedValue({ dashboard: fresh, stale: false }) }
    render(<BCDashboard api={api} lookups={{ hasBranch: false, locations: [] }} live onOpenReport={() => {}} />)

    expect(await screen.findByText('Sales kept')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(/Showing figures saved at .* Bringing them up to date/)
    await act(async () => { jest.advanceTimersByTime(4100); await Promise.resolve(); await Promise.resolve() })
    expect(await screen.findByText('Sales fresh')).toBeInTheDocument()
    expect(screen.queryByText('Sales kept')).toBeNull()
    expect(screen.queryByRole('status')).toBeNull()
    expect(api.getDashboard).toHaveBeenCalledTimes(2)
    jest.useRealTimers()
})
