import { useEffect, useMemo, useRef, useState } from 'react'
import { DATE_PRESETS, defaultRange, todayString } from './bcFormat'
import { keepToLimits, startAtLimits, useBCAccess } from './bcAccess'

const VISIBLE_OPTIONS = 200

// Dropdown with search and tick boxes. Item lists run to thousands of
// entries, so only the first matches are rendered and the search narrows them.
export const MultiSelect = ({ label, options, value, onChange, limited = false }) => {
    const [open, setOpen] = useState(false)
    const [search, setSearch] = useState('')
    const ref = useRef(null)

    useEffect(() => {
        if (!open) return undefined
        const close = (event) => { if (ref.current && !ref.current.contains(event.target)) setOpen(false) }
        document.addEventListener('mousedown', close)
        return () => document.removeEventListener('mousedown', close)
    }, [open])

    const matches = useMemo(() => {
        const needle = search.trim().toLowerCase()
        return needle ? options.filter((option) => option.label.toLowerCase().includes(needle)) : options
    }, [options, search])

    const toggle = (optionValue) => {
        onChange(value.includes(optionValue) ? value.filter((entry) => entry !== optionValue) : [...value, optionValue])
    }

    // For a limited filter every choice is one of the user's own values, so
    // having them all ticked reads as all of theirs.
    const all = limited ? options.length > 0 && value.length >= options.length : value.length === 0
    const summary = all ? (limited ? 'All of yours' : 'All') : value.length === 0 ? 'All' : value.length === 1 ? (options.find((option) => option.value === value[0])?.label || value[0]) : `${value.length} selected`

    return (
        <div className='bc-field bc-multi' ref={ref}>
            <span className='bc-field-label'>{label}</span>
            <button type='button' className='bc-input bc-multi-button' onClick={() => setOpen((state) => !state)} aria-expanded={open}>
                <span>{summary}</span>
            </button>
            {open && (
                <div className='bc-multi-panel'>
                    {options.length > 8 && (
                        <input className='bc-input' autoFocus placeholder={`Search ${label.toLowerCase()}`} value={search} onChange={(event) => setSearch(event.target.value)} />
                    )}
                    <div className='bc-multi-list'>
                        {matches.slice(0, VISIBLE_OPTIONS).map((option) => (
                            <label key={option.value} className='bc-check'>
                                <input type='checkbox' checked={value.includes(option.value)} onChange={() => toggle(option.value)} />
                                <span>{option.label}</span>
                            </label>
                        ))}
                        {options.length === 0 && <p className='bc-muted'>No values to choose from yet. They appear once a report has loaded.</p>}
                        {options.length > 0 && matches.length === 0 && <p className='bc-muted'>No matches.</p>}
                        {matches.length > VISIBLE_OPTIONS && <p className='bc-muted'>Showing the first {VISIBLE_OPTIONS}. Search to narrow the list.</p>}
                    </div>
                    {value.length > 0 && <button type='button' className='bc-link-button' onClick={() => onChange([])}>Clear selection</button>}
                </div>
            )}
        </div>
    )
}

// Starting values for a set of filter definitions. With `limits`, the
// period and values the user is kept to are where they start.
export const initialFilterValues = (filters, limits) => {
    const values = {}
    filters.forEach((filter) => {
        if (filter.type === 'dateRange') Object.assign(values, defaultRange())
        else if (filter.type === 'date') values[filter.key] = todayString()
        else if (filter.type === 'multi') values[filter.key] = []
        else if (filter.type === 'toggle') values[filter.key] = !!filter.default
        else if (filter.type === 'text') values[filter.key] = ''
        else values[filter.key] = filter.default
    })
    return limits ? startAtLimits(values, filters, limits, todayString()) : values
}

const LIMIT_LABELS = { locations: 'Locations', branches: 'Branches', categories: 'Item categories', items: 'Items', customers: 'Customers', vendors: 'Vendors', salespeople: 'Salespeople', purchasers: 'Purchasers', accounts: 'G/L accounts', banks: 'Bank accounts', docClasses: 'Document classes' }

/** One line saying what the user is kept to, shown under their filters. */
export const describeLimits = (limits, lookups) => {
    if (!limits) return ''
    const parts = Object.entries(limits.filters || {}).map(([key, values]) => {
        const options = lookups?.[key] || []
        const names = values.slice(0, 4).map((value) => options.find((option) => option.value === value)?.label || value)
        return `${LIMIT_LABELS[key] || key}: ${names.join(', ')}${values.length > 4 ? ` and ${values.length - 4} more` : ''}`
    })
    if (limits.window) {
        const when = limits.period === 'day' ? 'today' : 'this month'
        parts.push(limits.locked ? `Dates: ${when} only` : `Dates: opens on ${when}, earlier dates allowed`)
    }
    return parts.length ? `Your access is limited. ${parts.join('. ')}.` : ''
}

/**
 * Builds the filter controls a report asks for. `filters` is the list the
 * server sends with each report; `lookups` supplies the choices for filters
 * that point at one (items, locations, branches and so on).
 */
const BCFilterBar = ({ filters, values, onChange, lookups, onSubmit, submitLabel = 'Run report', busy, children }) => {
    const { limits } = useBCAccess()
    // Every change is kept to the user's limits, so the filters on screen are
    // the ones the report is run with.
    const set = (patch) => onChange(keepToLimits({ ...values, ...patch }, filters, limits))
    const window = limits?.locked ? limits.window : null
    const note = describeLimits(limits, lookups)

    return (
        <form className='bc-filter-bar' onSubmit={(event) => { event.preventDefault(); onSubmit() }}>
            {filters.map((filter) => {
                if (filter.type === 'dateRange') {
                    return (
                        <div key={filter.key} className='bc-field bc-field-range'>
                            <span className='bc-field-label'>{filter.label}</span>
                            <div className='bc-range'>
                                <input type='date' className='bc-input' value={values.from || ''} min={window?.start} max={values.to || window?.end || undefined} onChange={(event) => set({ from: event.target.value })} aria-label='From date' />
                                <span className='bc-muted'>to</span>
                                <input type='date' className='bc-input' value={values.to || ''} min={values.from || window?.start || undefined} max={window?.end} onChange={(event) => set({ to: event.target.value })} aria-label='To date' />
                                <select className='bc-input bc-preset' value='' onChange={(event) => { const preset = DATE_PRESETS.find((entry) => entry.key === event.target.value); if (preset) set(preset.resolve()) }} aria-label='Quick period'>
                                    <option value=''>Quick period</option>
                                    {DATE_PRESETS.map((preset) => <option key={preset.key} value={preset.key}>{preset.label}</option>)}
                                </select>
                            </div>
                        </div>
                    )
                }
                if (filter.type === 'date') {
                    return (
                        <label key={filter.key} className='bc-field'>
                            <span className='bc-field-label'>{filter.label}</span>
                            <input type='date' className='bc-input' value={values[filter.key] || ''} min={window?.start} max={window?.end} onChange={(event) => set({ [filter.key]: event.target.value })} />
                        </label>
                    )
                }
                if (filter.type === 'multi') {
                    const options = filter.options || lookups?.[filter.lookup] || []
                    // A filter the company has no values for (salespeople, in a
                    // company that does not use them) would only ever be an
                    // empty list, so it is left off.
                    if (filter.optional && lookups && options.length === 0) return null
                    return <MultiSelect key={filter.key} label={filter.label} options={options} limited={!!limits?.filters?.[filter.key]?.length} value={values[filter.key] || []} onChange={(next) => set({ [filter.key]: next })} />
                }
                if (filter.type === 'select') {
                    return (
                        <label key={filter.key} className='bc-field'>
                            <span className='bc-field-label'>{filter.label}</span>
                            <select className='bc-input' value={values[filter.key] ?? filter.default} onChange={(event) => set({ [filter.key]: event.target.value })}>
                                {filter.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                            </select>
                        </label>
                    )
                }
                if (filter.type === 'number') {
                    return (
                        <label key={filter.key} className='bc-field bc-field-narrow'>
                            <span className='bc-field-label'>{filter.label}</span>
                            <input type='number' className='bc-input' min={filter.min} max={filter.max} value={values[filter.key] ?? ''} onChange={(event) => set({ [filter.key]: event.target.value })} />
                        </label>
                    )
                }
                if (filter.type === 'text') {
                    return (
                        <label key={filter.key} className='bc-field'>
                            <span className='bc-field-label'>{filter.label}</span>
                            <input type='text' className='bc-input' value={values[filter.key] || ''} onChange={(event) => set({ [filter.key]: event.target.value })} />
                        </label>
                    )
                }
                if (filter.type === 'toggle') {
                    return (
                        <label key={filter.key} className='bc-check bc-field-toggle' title={filter.hint || ''}>
                            <input type='checkbox' checked={!!values[filter.key]} onChange={(event) => set({ [filter.key]: event.target.checked })} />
                            <span>{filter.label}</span>
                        </label>
                    )
                }
                return null
            })}
            <button type='submit' className='bc-button bc-button-primary' disabled={busy}>{busy ? 'Working...' : submitLabel}</button>
            {children}
            {note && <p className='bc-muted bc-filter-limits'>{note}</p>}
        </form>
    )
}

export default BCFilterBar
