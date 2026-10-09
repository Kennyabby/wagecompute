import { useEffect, useMemo, useState } from 'react'
import { formatValue } from './bcFormat'

const PAGE_SIZE = 100
const NUMERIC = new Set(['money', 'qty', 'number', 'percent'])

export const isNumericColumn = (column) => NUMERIC.has(column.type)

/**
 * Sortable, paged table for report rows. `columns` come from the report
 * ({ key, label, type, total }); columns flagged `total` get a footer sum from
 * `totals`. Sorting and search work on all rows, not just the visible page.
 */
const BCDataTable = ({ columns, rows, totals = {} }) => {
    const [sort, setSort] = useState(null)
    const [page, setPage] = useState(0)
    const [search, setSearch] = useState('')

    useEffect(() => { setPage(0); setSort(null); setSearch('') }, [rows])

    const filtered = useMemo(() => {
        const needle = search.trim().toLowerCase()
        if (!needle) return rows
        const textColumns = columns.filter((column) => !isNumericColumn(column))
        return rows.filter((row) => textColumns.some((column) => String(row[column.key] ?? '').toLowerCase().includes(needle)))
    }, [rows, columns, search])

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

    const pageCount = Math.max(Math.ceil(sorted.length / PAGE_SIZE), 1)
    const visible = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
    const hasTotals = columns.some((column) => column.total)

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
                <span className='bc-muted'>
                    {filtered.length === rows.length ? `${rows.length.toLocaleString()} rows` : `${filtered.length.toLocaleString()} of ${rows.length.toLocaleString()} rows`}
                </span>
            </div>
            <div className='bc-table-scroll'>
                <table className='bc-table'>
                    <thead>
                        <tr>
                            {columns.map((column) => (
                                <th key={column.key} className={isNumericColumn(column) ? 'bc-num' : ''} aria-sort={sort?.key === column.key ? (sort.descending ? 'descending' : 'ascending') : 'none'}>
                                    <button type='button' onClick={() => toggleSort(column.key)}>
                                        {column.label}
                                        <span className='bc-sort'>{sort?.key === column.key ? (sort.descending ? '▼' : '▲') : ''}</span>
                                    </button>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {visible.map((row, index) => (
                            <tr key={page * PAGE_SIZE + index}>
                                {columns.map((column) => (
                                    <td key={column.key} className={isNumericColumn(column) ? 'bc-num' : ''} title={isNumericColumn(column) ? undefined : String(row[column.key] ?? '')}>{formatValue(row[column.key], column.type)}</td>
                                ))}
                            </tr>
                        ))}
                        {visible.length === 0 && (
                            <tr><td colSpan={columns.length} className='bc-empty'>No rows match.</td></tr>
                        )}
                    </tbody>
                    {hasTotals && rows.length > 0 && (
                        <tfoot>
                            <tr>
                                {columns.map((column, index) => (
                                    <td key={column.key} className={isNumericColumn(column) ? 'bc-num' : ''}>
                                        {column.total ? formatValue(totals[column.key], column.type) : (index === 0 ? 'Total' : '')}
                                    </td>
                                ))}
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
            {pageCount > 1 && (
                <div className='bc-pager'>
                    <button type='button' className='bc-button' disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button>
                    <span className='bc-muted'>Page {page + 1} of {pageCount}</span>
                    <button type='button' className='bc-button' disabled={page >= pageCount - 1} onClick={() => setPage(page + 1)}>Next</button>
                </div>
            )}
        </div>
    )
}

export default BCDataTable
