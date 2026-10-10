import { useEffect, useMemo, useState } from 'react'
import { formatValue } from './bcFormat'

const PAGE_SIZE = 100
const NUMERIC = new Set(['money', 'qty', 'number', 'percent'])

export const isNumericColumn = (column) => NUMERIC.has(column.type)

// A text column with this few different values gets a pick list as its
// filter. Anything longer gets a box to type in.
const PICK_LIST_MAX = 40
const BLANK = '\u0000blank'

const round2 = (value) => Math.round(value * 100) / 100

/**
 * Turns what was typed into a column filter into a test for one cell.
 * Understands >, >=, <, <=, = and "from..to", on numbers and on dates.
 * Anything else is a plain "contains" match on the text shown in the cell.
 */
const cellTest = (column, typed) => {
    const text = typed.trim()
    if (!text) return null
    const numeric = isNumericColumn(column)
    const read = (raw) => (numeric ? Number(String(raw).replace(/,/g, '')) : String(raw).trim().toLowerCase())
    const usable = (value) => (numeric ? Number.isFinite(value) : value !== '')
    const cell = (row) => (numeric ? Number(row[column.key]) : String(row[column.key] ?? '').toLowerCase())

    const range = text.match(/^(.+?)\.\.(.+)$/)
    if (range) {
        const [low, high] = [read(range[1]), read(range[2])]
        if (usable(low) && usable(high)) return (row) => row[column.key] !== '' && cell(row) >= low && cell(row) <= high
    }
    const compare = text.match(/^(>=|<=|>|<|=)\s*(.+)$/)
    if (compare) {
        const bound = read(compare[2])
        if (usable(bound)) {
            const tests = { '>': (value) => value > bound, '>=': (value) => value >= bound, '<': (value) => value < bound, '<=': (value) => value <= bound, '=': (value) => value === bound }
            return (row) => row[column.key] !== '' && row[column.key] !== null && row[column.key] !== undefined && tests[compare[1]](cell(row))
        }
    }
    const needle = text.toLowerCase().replace(/,/g, '')
    return (row) => (
        String(row[column.key] ?? '').toLowerCase().includes(needle) ||
        formatValue(row[column.key], column.type).toLowerCase().replace(/,/g, '').includes(needle)
    )
}

/**
 * Sortable, paged table for report rows. `columns` come from the report
 * ({ key, label, type, total }); columns flagged `total` get a footer sum from
 * `totals`. Sorting and search work on all rows, not just the visible page.
 *
 * When `onDrill` is given, figures in columns flagged `drill` become buttons
 * that call it with the row and the column, to open the breakdown behind them.
 *
 * Financial statements use three hints. A column marked `indent` steps its
 * text in by the row's `_level`, a row marked `_emphasis` (a heading or a
 * total) is set in bold, and a column marked `wrap` runs onto several lines
 * instead of being cut short. A row marked `_noDrill` has nothing to open.
 *
 * `manageColumns` adds a chooser for which columns are shown, and `pageSizes`
 * a choice of how many rows make a page.
 *
 * With `filterable`, every column gets its own filter under its heading and
 * the totals follow whatever is filtered. `onView` is then told which rows,
 * totals and filters are on screen, so an export can match the table.
 */
const BCDataTable = ({ columns, rows, totals = {}, onDrill, filterable = false, onView, manageColumns = false, pageSizes = null }) => {
    const [sort, setSort] = useState(null)
    const [page, setPage] = useState(0)
    const [hidden, setHidden] = useState([])
    const [choosing, setChoosing] = useState(false)
    const [pageSize, setPageSize] = useState(pageSizes?.includes(PAGE_SIZE) ? PAGE_SIZE : (pageSizes?.[0] || PAGE_SIZE))
    const shown = useMemo(() => (hidden.length ? columns.filter((column) => !hidden.includes(column.key)) : columns), [columns, hidden])
    const [search, setSearch] = useState('')
    const [columnFilters, setColumnFilters] = useState({})

    useEffect(() => { setPage(0); setSort(null); setSearch(''); setColumnFilters({}) }, [rows])

    // Text columns with few different values are filtered from a pick list.
    const pickLists = useMemo(() => {
        const lists = {}
        if (!filterable) return lists
        columns.filter((column) => !isNumericColumn(column) && column.type !== 'date').forEach((column) => {
            const values = new Set()
            for (const row of rows) {
                values.add(String(row[column.key] ?? ''))
                if (values.size > PICK_LIST_MAX) return
            }
            lists[column.key] = [...values].sort((a, b) => a.localeCompare(b))
        })
        return lists
    }, [filterable, columns, rows])

    const activeFilters = useMemo(() => columns
        .filter((column) => String(columnFilters[column.key] ?? '').trim())
        .map((column) => {
            const typed = columnFilters[column.key]
            if (pickLists[column.key]) {
                const wanted = typed === BLANK ? '' : typed
                return { column, shown: wanted || '(blank)', test: (row) => String(row[column.key] ?? '') === wanted }
            }
            return { column, shown: typed.trim(), test: cellTest(column, typed) }
        })
        .filter((entry) => entry.test), [columns, columnFilters, pickLists])

    const filtered = useMemo(() => {
        const needle = search.trim().toLowerCase()
        const textColumns = columns.filter((column) => !isNumericColumn(column))
        return rows.filter((row) => (
            (!needle || textColumns.some((column) => String(row[column.key] ?? '').toLowerCase().includes(needle))) &&
            activeFilters.every((entry) => entry.test(row))
        ))
    }, [rows, columns, search, activeFilters])

    // While anything is filtered the totals are those of the rows left. With
    // nothing filtered they are the ones that came with the data.
    const narrowed = filterable && filtered.length !== rows.length
    const shownTotals = useMemo(() => {
        if (!narrowed) return totals
        // Only a column whose total is the sum of its lines can be totalled
        // again from the lines left. An average or a formula cannot.
        return Object.fromEntries(columns.filter((column) => column.total && column.additive !== false).map((column) => [
            column.key,
            round2(filtered.reduce((sum, row) => sum + (Number(row[column.key]) || 0), 0)),
        ]))
    }, [narrowed, totals, columns, filtered])

    const setFilter = (key, value) => { setColumnFilters((current) => ({ ...current, [key]: value })); setPage(0) }
    const clearFilters = () => { setColumnFilters({}); setSearch(''); setPage(0) }
    const anyFilter = activeFilters.length > 0 || !!search.trim()

    const sorted = useMemo(() => {
        if (!sort) return filtered
        const column = columns.find((entry) => entry.key === sort.key)
        const direction = sort.descending ? -1 : 1
        return [...filtered].sort((a, b) => {
            const left = a[sort.key]
            const right = b[sort.key]
            // Blank values go last whichever way the column is sorted.
            if (left === null || left === undefined || left === '') return 1
            if (right === null || right === undefined || right === '') return -1
            return (isNumericColumn(column) ? left - right : String(left).localeCompare(String(right))) * direction
        })
    }, [filtered, sort, columns])

    useEffect(() => {
        if (!onView) return
        const described = Object.fromEntries(activeFilters.map((entry) => [entry.column.label, entry.shown]))
        if (search.trim()) described.Search = search.trim()
        onView({ rows: sorted, totals: shownTotals, filters: described, filtered: sorted.length !== rows.length, columns: shown })
    }, [onView, sorted, shownTotals, activeFilters, search, rows, shown])

    const pageCount = Math.max(Math.ceil(sorted.length / pageSize), 1)
    const visible = sorted.slice(page * pageSize, (page + 1) * pageSize)
    const hasTotals = shown.some((column) => column.total)
    const toggleColumn = (key) => setHidden((current) => (current.includes(key) ? current.filter((entry) => entry !== key) : (current.length < columns.length - 1 ? [...current, key] : current)))

    const toggleSort = (key) => {
        setPage(0)
        setSort((current) => {
            if (!current || current.key !== key) return { key, descending: false }
            return current.descending ? null : { key, descending: true }
        })
    }

    return (
        <div className='bc-data-table'>
            <div className='bc-table-tools'>
                <input className='bc-input' placeholder='Search these rows' value={search} onChange={(event) => { setSearch(event.target.value); setPage(0) }} aria-label='Search rows' />
                <span className='bc-table-count bc-muted'>
                    {filtered.length === rows.length ? `${rows.length.toLocaleString()} rows` : `${filtered.length.toLocaleString()} of ${rows.length.toLocaleString()} rows`}
                    {filterable && anyFilter && <button type='button' className='bc-link-button' onClick={clearFilters}>Clear filters</button>}
                    {manageColumns && (
                        <button type='button' className='bc-link-button' aria-expanded={choosing} onClick={() => setChoosing((open) => !open)}>
                            {choosing ? 'Done choosing columns' : `Columns${hidden.length ? ` (${hidden.length} hidden)` : ''}`}
                        </button>
                    )}
                </span>
            </div>
            {manageColumns && choosing && (
                <div className='bc-column-chooser' role='group' aria-label='Columns to show'>
                    {columns.map((column) => (
                        <label key={column.key} className='bc-check'>
                            <input type='checkbox' checked={!hidden.includes(column.key)} onChange={() => toggleColumn(column.key)} />
                            <span>{column.label}</span>
                        </label>
                    ))}
                    {hidden.length > 0 && <button type='button' className='bc-link-button' onClick={() => setHidden([])}>Show all</button>}
                </div>
            )}
            <div className='bc-table-scroll'>
                <table className='bc-table'>
                    <thead>
                        <tr>
                            {shown.map((column) => (
                                <th key={column.key} className={isNumericColumn(column) ? 'bc-num' : ''} aria-sort={sort?.key === column.key ? (sort.descending ? 'descending' : 'ascending') : 'none'}>
                                    <button type='button' onClick={() => toggleSort(column.key)}>
                                        {column.label}
                                        <span className='bc-sort'>{sort?.key === column.key ? (sort.descending ? '▼' : '▲') : ''}</span>
                                    </button>
                                </th>
                            ))}
                        </tr>
                        {filterable && (
                            <tr className='bc-filter-row'>
                                {shown.map((column) => (
                                    <th key={column.key} className={isNumericColumn(column) ? 'bc-num' : ''}>
                                        {pickLists[column.key] ? (
                                            <select className='bc-input bc-column-filter' value={columnFilters[column.key] || ''} onChange={(event) => setFilter(column.key, event.target.value)} aria-label={`Filter by ${column.label}`}>
                                                <option value=''>All</option>
                                                {pickLists[column.key].map((value) => <option key={value} value={value || BLANK}>{value || '(blank)'}</option>)}
                                            </select>
                                        ) : (
                                            <input
                                                className='bc-input bc-column-filter'
                                                value={columnFilters[column.key] || ''}
                                                onChange={(event) => setFilter(column.key, event.target.value)}
                                                placeholder={isNumericColumn(column) ? 'e.g. >100' : (column.type === 'date' ? 'e.g. 2026-09' : 'Contains')}
                                                title={isNumericColumn(column) || column.type === 'date' ? 'Type part of the value, or use >, >=, <, <=, = or from..to' : 'Type part of the value'}
                                                aria-label={`Filter by ${column.label}`}
                                            />
                                        )}
                                    </th>
                                ))}
                            </tr>
                        )}
                    </thead>
                    <tbody>
                        {visible.map((row, index) => (
                            <tr key={page * pageSize + index} className={row._emphasis ? 'bc-row-strong' : ''}>
                                {shown.map((column) => {
                                    const numeric = isNumericColumn(column)
                                    const text = formatValue(row[column.key], column.type)
                                    // A zero has nothing behind it worth opening.
                                    // `pick` makes a column of names clickable too, for a
                                    // caller that offers something to do with the name.
                                    const drillable = onDrill && !row._noDrill && ((column.drill && Number(row[column.key])) || (column.pick && row[column.key] !== undefined && row[column.key] !== ''))
                                    const indent = column.indent && row._level ? { paddingLeft: `calc(var(--space-3) + ${Math.min(row._level, 8) * 18}px)` } : undefined
                                    return (
                                        <td key={column.key} className={numeric ? `bc-num${column.signed && Number(row[column.key]) ? (Number(row[column.key]) > 0 ? ' bc-pos' : ' bc-neg') : ''}` : (column.wrap ? 'bc-wrap' : '')} style={indent} title={numeric || column.wrap ? undefined : String(row[column.key] ?? '')}>
                                            {drillable
                                                ? <button type='button' className='bc-drill' title={column.pick ? 'Show only this, or leave it out' : `See what makes up this ${column.label.toLowerCase()}`} onClick={() => onDrill(row, column)}>{text}</button>
                                                : text}
                                        </td>
                                    )
                                })}
                            </tr>
                        ))}
                        {visible.length === 0 && (
                            <tr><td colSpan={shown.length} className='bc-empty'>No rows match.</td></tr>
                        )}
                    </tbody>
                    {hasTotals && rows.length > 0 && (
                        <tfoot>
                            <tr>
                                {shown.map((column, index) => (
                                    <td key={column.key} className={isNumericColumn(column) ? 'bc-num' : ''}>
                                        {column.total && !(narrowed && column.additive === false) ? formatValue(shownTotals[column.key], column.type) : (index === 0 ? (narrowed ? 'Total (filtered)' : 'Total') : '')}
                                    </td>
                                ))}
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
            {(pageCount > 1 || pageSizes) && (
                <div className='bc-pager'>
                    {pageSizes && (
                        <label className='bc-page-size'>
                            <span className='bc-muted'>Rows per page</span>
                            <select className='bc-input' value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(0) }}>
                                {pageSizes.map((size) => <option key={size} value={size}>{size}</option>)}
                            </select>
                        </label>
                    )}
                    <button type='button' className='bc-button' disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button>
                    <span className='bc-muted'>Page {page + 1} of {pageCount}</span>
                    <button type='button' className='bc-button' disabled={page >= pageCount - 1} onClick={() => setPage(page + 1)}>Next</button>
                </div>
            )}
        </div>
    )
}

export default BCDataTable
