import { fireEvent, render, screen } from '@testing-library/react'
import BCDashboard from './BCDashboard'
import BCFilterBar from './BCFilterBar'

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
