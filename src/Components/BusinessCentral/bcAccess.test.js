import { fireEvent, render, screen } from '@testing-library/react'
import { BCAccessProvider, keepToLimits, makeAccess, startAtLimits } from './bcAccess'
import BCFilterBar, { initialFilterValues } from './BCFilterBar'

const filters = [
    { key: 'dateRange', type: 'dateRange', label: 'Period' },
    { key: 'locations', type: 'multi', label: 'Location', lookup: 'locations' },
    { key: 'items', type: 'multi', label: 'Item', lookup: 'items' },
]
const month = { filters: { locations: ['DEPOT', 'SHOP'] }, period: 'month', backlog: false, window: { start: '2026-10-01', end: '2026-10-31' }, locked: true, restricted: true }

describe('user limits on filters', () => {
    test('a limited filter holds only the user\'s values, all of them when none is chosen', () => {
        expect(keepToLimits({ locations: [] }, filters, month).locations).toEqual(['DEPOT', 'SHOP'])
        expect(keepToLimits({ locations: ['FACTORY', 'SHOP'] }, filters, month).locations).toEqual(['SHOP'])
        expect(keepToLimits({ items: ['A'] }, filters, month).items).toEqual(['A'])
    })

    test('without earlier dates the period stays inside the month', () => {
        const kept = keepToLimits({ from: '2026-09-01', to: '2026-11-30' }, filters, month)
        expect([kept.from, kept.to]).toEqual(['2026-10-01', '2026-10-31'])
        // With earlier dates allowed the month is only where reports open.
        const open = { ...month, backlog: true, locked: false }
        expect(keepToLimits({ from: '2026-01-01', to: '2026-10-20' }, filters, open).from).toBe('2026-01-01')
        expect(startAtLimits({ from: '2026-01-01', to: '2026-01-31' }, filters, open, '2026-10-20')).toMatchObject({ from: '2026-10-01', to: '2026-10-20' })
    })

    test('a daily period opens on today', () => {
        const day = { filters: {}, period: 'day', backlog: true, window: { start: '2026-10-20', end: '2026-10-20' }, locked: false }
        expect(startAtLimits({ from: '2026-10-01', to: '2026-10-20' }, filters, day, '2026-10-20')).toMatchObject({ from: '2026-10-20', to: '2026-10-20' })
    })

    test('the filter bar starts at the limits, says so, and cannot be cleared past them', () => {
        const values = initialFilterValues(filters, month)
        expect(values.locations).toEqual(['DEPOT', 'SHOP'])
        const onChange = jest.fn()
        const lookups = { locations: [{ value: 'DEPOT', label: 'DEPOT - Depot' }, { value: 'SHOP', label: 'SHOP - Shop' }], items: [] }
        render(
            <BCAccessProvider value={makeAccess({ admin: false, tabs: ['reports'], actions: [], reports: { all: true }, limits: month })}>
                <BCFilterBar filters={filters} values={values} onChange={onChange} lookups={lookups} onSubmit={() => {}} />
            </BCAccessProvider>,
        )
        expect(screen.getByText(/Your access is limited\. Locations: DEPOT - Depot, SHOP - Shop\. Dates: this month only\./)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'All of yours' })).toBeInTheDocument()
        expect(screen.getByLabelText('From date')).toHaveAttribute('min', '2026-10-01')
        fireEvent.change(screen.getByLabelText('From date'), { target: { value: '2026-08-01' } })
        expect(onChange.mock.calls[0][0].from).toBe('2026-10-01')
    })
})
