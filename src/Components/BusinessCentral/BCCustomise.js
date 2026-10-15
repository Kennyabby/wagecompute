import { useState } from 'react'

/**
 * Changes to a report that comes with the module: its title, its columns
 * (renamed, hidden, reordered) and the filter values it opens with. What
 * the report works out stays as it is; these change how it is shown, and
 * "Back to the original" undoes them all.
 */
const BCCustomise = ({ api, definition, report, values, onSaved, onClose, notify }) => {
    // Every column the report has, hidden ones included, in the saved order.
    const [columns, setColumns] = useState(() => {
        const saved = definition.customised?.columns || []
        const known = new Map(saved.map((column) => [column.key, column]))
        const current = (report?.columns || []).map((column) => ({ key: column.key, label: known.get(column.key)?.label || '', original: column.label, hidden: false }))
        const hiddenOnes = saved.filter((column) => column.hidden && !current.some((entry) => entry.key === column.key)).map((column) => ({ key: column.key, label: column.label, original: column.key, hidden: true }))
        const all = [...current, ...hiddenOnes]
        const order = new Map(saved.map((column, index) => [column.key, index]))
        return all.sort((a, b) => (order.has(a.key) ? order.get(a.key) : 1000) - (order.has(b.key) ? order.get(b.key) : 1000))
    })
    const [title, setTitle] = useState(definition.originalTitle ? definition.title : '')
    const [keepFilters, setKeepFilters] = useState(Object.keys(definition.savedDefaults || {}).length > 0)
    const [busy, setBusy] = useState(false)

    const update = (index, patch) => setColumns(columns.map((column, at) => (at === index ? { ...column, ...patch } : column)))
    const move = (index, step) => {
        const target = index + step
        if (target < 0 || target >= columns.length) return
        const next = [...columns]
        ;[next[index], next[target]] = [next[target], next[index]]
        setColumns(next)
    }
    // Dates are left out: a saved period would stop moving with the calendar.
    const datedKeys = new Set(definition.filters.filter((filter) => ['dateRange', 'date'].includes(filter.type)).flatMap((filter) => (filter.type === 'dateRange' ? ['from', 'to'] : [filter.key])))
    const defaults = Object.fromEntries(Object.entries(values || {}).filter(([key]) => !datedKeys.has(key) && definition.filters.some((filter) => filter.key === key)))

    const save = async () => {
        setBusy(true)
        try {
            await api.customiseReport(definition.key, {
                title: title.trim(),
                columns: columns.map((column) => ({ key: column.key, label: column.label.trim(), hidden: column.hidden })),
                defaults: keepFilters ? defaults : {},
            })
            notify('success', 'Saved. Everyone who opens this report sees it this way.')
            onSaved()
        } catch (failure) { notify('error', failure.message) } finally { setBusy(false) }
    }
    const reset = async () => {
        if (!window.confirm('Put this report back as it came, undoing every change made to it?')) return
        setBusy(true)
        try {
            await api.resetReport(definition.key)
            notify('success', 'The report is back as it came.')
            onSaved()
        } catch (failure) { notify('error', failure.message) } finally { setBusy(false) }
    }

    return (
        <section className='bc-card'>
            <h3>Customise this report</h3>
            <p className='bc-muted'>Rename the report and its columns, hide columns you do not need, and put them in the order you want. What the report works out does not change. Saved for everyone who opens it in this workspace.</p>
            <label className='bc-field bc-field-wide'><span className='bc-field-label'>Report title</span><input className='bc-input' placeholder={definition.originalTitle || definition.title} value={title} onChange={(event) => setTitle(event.target.value)} /></label>
            <div className='bc-table-scroll'>
                <table className='bc-table'>
                    <thead><tr><th>Show</th><th>Column</th><th>Show it as</th><th>Order</th></tr></thead>
                    <tbody>
                        {columns.map((column, index) => (
                            <tr key={column.key}>
                                <td><input type='checkbox' aria-label={`Show ${column.original}`} checked={!column.hidden} onChange={() => update(index, { hidden: !column.hidden })} /></td>
                                <td>{column.original}</td>
                                <td><input className='bc-input' aria-label={`New name for ${column.original}`} placeholder={column.original} value={column.label} onChange={(event) => update(index, { label: event.target.value })} /></td>
                                <td className='bc-arrange-moves'>
                                    <button type='button' className='bc-button' aria-label={`Move ${column.original} up`} disabled={index === 0} onClick={() => move(index, -1)}>Up</button>
                                    <button type='button' className='bc-button' aria-label={`Move ${column.original} down`} disabled={index === columns.length - 1} onClick={() => move(index, 1)}>Down</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <label className='bc-einv-switch'>
                <input type='checkbox' checked={keepFilters} onChange={(event) => setKeepFilters(event.target.checked)} />
                <span>Open the report with the filters chosen now<span className='bc-muted'> (all but the dates, which always start at this month)</span></span>
            </label>
            <div className='bc-einv-actions'>
                <button type='button' className='bc-button bc-button-primary' disabled={busy} onClick={save}>{busy ? 'Saving...' : 'Save changes'}</button>
                {definition.customised && <button type='button' className='bc-button' disabled={busy} onClick={reset}>Back to the original</button>}
                <button type='button' className='bc-button' onClick={onClose}>Close</button>
            </div>
        </section>
    )
}

export default BCCustomise
