import { useEffect, useMemo, useState } from 'react'
import StatCard from '../Shared/ui/StatCard'
import StatCardGrid from '../Shared/ui/StatCardGrid'
import BCChart from './BCChart'
import BCDataTable from './BCDataTable'
import { defaultRange, formatKpi, formatValue } from './bcFormat'
import BCPreparing, { BCUpdating, usePreparingRetry } from './BCPreparing'

const letter = (index) => String.fromCharCode(65 + index)

const EMPTY = {
    name: '',
    description: '',
    service: '',
    dateField: '',
    rows: [],
    across: null,
    pages: [],
    links: [],
    join: 'all',
    measures: [{ page: 0, field: '', aggregate: 'count', label: '' }],
    formulas: [],
    filters: [],
    tiles: [],
    chart: { type: 'none', outputs: [0] },
    sort: { output: 0, descending: true },
    limit: 500,
    pinned: false,
}
const EMPTY_PAGE = { service: '', dateField: '', filters: [], match: [], matchAcross: '' }
const EMPTY_LINK = { page: 0, from: '', service: '', to: '', fields: [] }

// A report saved before pages could be combined has no pages, links or page
// numbers on its figures.
const opened = (spec) => ({
    ...EMPTY,
    ...spec,
    pages: (spec.pages || []).map((page) => ({ ...EMPTY_PAGE, ...page })),
    links: (spec.links || []).map((link) => ({ ...EMPTY_LINK, ...link })),
    measures: (spec.measures || EMPTY.measures).map((measure) => ({ page: 0, ...measure })),
})

const LIMITS = { rows: 4, measures: 12, formulas: 8, filters: 10, tiles: 6, pages: 3, links: 4, linkFields: 4 }
const JOINS = { all: 'Every line found on any page', first: 'Only lines the first page has' }
const FORMATS = [{ value: 'money', label: 'Money (2 decimals)' }, { value: 'qty', label: 'Quantity' }, { value: 'number', label: 'Whole number' }, { value: 'percent', label: 'Percent' }]
const CHART_LABELS = { none: 'No chart', bar: 'Bars', horizontalBar: 'Bars lying down (good for long names)', line: 'Line (good for time)' }
const LINKED = /^L(\d+)\./

// The guide shown above the builder. Kept here, beside the form it explains,
// so the two cannot drift apart.
export const GUIDE = [
    {
        title: '1. Name it and choose where the data comes from',
        body: 'Give the report a name people will recognise. Then choose the Business Central page it reads first. Every page published as a web service is in the list: ledger entries, customers, items, orders, fixed assets, jobs and the rest. If a page you need is missing, publish it in Business Central and reopen the builder.',
    },
    {
        title: '2. Choose the period',
        body: 'Pick the date field that decides which rows belong to a period, usually Posting Date. The report then asks for a period each time it is run. Leave it at "No period" for lists that have no dates, such as customers or items. Large ledgers need a period: a report stops reading a page after 150,000 rows and says so.',
    },
    {
        title: '3. Build the table: rows down the side',
        body: 'Each "row" is something to group by: customer number, item number, location. Add up to four, and the table gets one line for each combination. A date can be grouped by day, month, quarter or year. With no rows at all, the report is a single line of totals.',
    },
    {
        title: '4. Add columns across, if you want a pivot table',
        body: 'Optional. Choose one field to spread across the top, the way a pivot table does: items down the side and locations across, for example. Up to 40 columns are shown.',
    },
    {
        title: '5. Add the figures',
        body: 'A figure is a number worked out for each line: the sum of an amount, an average, the smallest or largest value, a count of rows, or a count of different values. Each figure gets a letter: the first is A, the second B. The strip at the top of the table section shows the layout as a sheet, with the letter over each column.',
    },
    {
        title: '6. Combine more pages in one report',
        body: 'A report can read up to four pages at once. Add a page, then say which of its fields holds the same thing as each row grouping: if the rows are Item No from Value Entries, the Item Ledger Entries page matches with its own Item No. Each figure says which page it is read from, and the figures of every page land on the same line. Sales from one page then sit beside purchases from another, and a formula can work on both. Each page has its own period field and its own filters. Choose whether to keep every line found on any page, or only the lines the first page has.',
    },
    {
        title: '7. Link to another page for names and details',
        body: 'A link is a lookup, like VLOOKUP in a spreadsheet. It takes a field of a page (Customer No), finds the row of another page where a field holds the same value (No on Customers), and brings in up to four of its fields (Name, City). Linked fields then appear in the field lists with the linked page\'s name in front, and can be used as row groupings, columns across or figures. Link to lists such as customers, items and accounts. A ledger is too long to look up.',
    },
    {
        title: '8. Add formulas, like a spreadsheet',
        body: 'A formula works on the figures by their letters, whichever page each figure comes from. With sales as A and cost as B, "=A+B" is the profit (costs are negative in the ledger) and "=(A+B)/A*100" is the margin in percent. Use + - * / and brackets. ABS, ROUND, MIN, MAX and IF work as they do in a spreadsheet: "=IF(A>B, A-B, 0)", "=ROUND(A/B, 2)". Formulas are worked out for the totals too, so a margin is right for the whole report and is not an average of averages.',
    },
    {
        title: '9. Narrow it down with filters',
        body: 'Filters keep only the rows you want: entry type is Sale, amount is more than 100,000, name contains "LTD". "Is one of" takes a list separated by commas. Write dates as 2026-09-30. Each page has its own filters, and a filter can only use a field of its own page, never a linked one.',
    },
    {
        title: '10. Add tiles and a chart',
        body: 'Tiles are the headline numbers at the top of the report: tick the figures or formulas to show, and they are worked out over the whole report. A chart plots up to three of them against the first row grouping. Use a line for dates and bars for everything else.',
    },
    {
        title: '11. Preview, then save',
        body: 'Preview runs the report as it stands. When it looks right, save it. It then appears under Reports in "My reports", where anyone with access to this module can run it, filter it and export it. Tick "Show on the dashboard" to put its tiles and chart on the dashboard as well. Only you or an admin can change or delete it.',
    },
]

const labelIn = (fields, name) => fields.find((field) => field.name === name)?.label || name

/**
 * Builds a report from published Business Central pages: one page or several
 * combined on shared row groupings, lookups into other pages, figures,
 * spreadsheet-style formulas, filters, tiles and a chart. `saved` is the
 * report being edited, or null for a new one.
 */
const BCBuilder = ({ api, saved = null, onSaved, onClose, notify }) => {
    const [schema, setSchema] = useState(null)
    const [spec, setSpec] = useState(() => (saved ? opened(saved.spec) : EMPTY))
    const [range, setRange] = useState(defaultRange)
    const [report, setReport] = useState(null)
    const [busy, setBusy] = useState('')
    const [error, setError] = useState('')
    const [guideOpen, setGuideOpen] = useState(!saved)
    const [search, setSearch] = useState('')
    const { preparing, updating, awaitData } = usePreparingRetry()

    useEffect(() => {
        let active = true
        api.getBuilderSchema().then((response) => { if (active) setSchema(response.schema) }).catch((failure) => { if (active) setError(failure.message) })
        return () => { active = false }
    }, [api])

    const tableOf = (service) => schema?.tables.find((entry) => entry.service === service) || null
    const table = tableOf(spec.service)
    // Page 1 is the report's main page. The others follow in the order added.
    const pageTables = [table, ...spec.pages.map((page) => tableOf(page.service))]
    const pageName = (page) => `Page ${page + 1}${pageTables[page] ? `: ${pageTables[page].label}` : ''}`
    const ownFields = (page) => pageTables[page]?.fields || []
    // A page's own fields, then the ones its links bring in, named L1.Name.
    const fieldsOf = (page) => [
        ...ownFields(page),
        ...spec.links.flatMap((link, index) => {
            const other = link.page === page ? tableOf(link.service) : null
            if (!other) return []
            return link.fields.map((name) => other.fields.find((field) => field.name === name)).filter(Boolean).map((field) => ({ name: `L${index + 1}.${field.name}`, label: `${other.label}: ${field.label}`, type: field.type }))
        }),
    ]
    const fields = fieldsOf(0)
    const typeOf = (page, name) => fieldsOf(page).find((field) => field.name === name)?.type
    const dates = (list) => list.filter((field) => field.type === 'date')
    const numbers = (list) => list.filter((field) => field.type === 'number')
    const several = spec.pages.length > 0
    const hasPeriod = !!spec.dateField || spec.pages.some((page) => page.dateField)

    const measureLabel = (measure) => measure.label || (measure.aggregate === 'count' ? 'Count' : `${schema?.aggregates[measure.aggregate] || ''} of ${labelIn(fieldsOf(measure.page || 0), measure.field)}`)
    const outputs = [
        ...spec.measures.map((measure, index) => ({ index, label: `${letter(index)}: ${measureLabel(measure)}` })),
        ...spec.formulas.map((formula, index) => ({ index: spec.measures.length + index, label: `${formula.label || `Formula ${index + 1}`} ${formula.expression}` })),
    ]
    const tables = useMemo(() => {
        const needle = search.trim().toLowerCase()
        return (schema?.tables || []).filter((entry) => !needle || entry.label.toLowerCase().includes(needle) || entry.service.toLowerCase().includes(needle) || entry.service === spec.service)
    }, [schema, search, spec.service])

    const change = (patch) => { setSpec((current) => ({ ...current, ...patch })); setReport(null) }
    const changeIn = (list, index, patch) => change({ [list]: spec[list].map((entry, at) => (at === index ? { ...entry, ...patch } : entry)) })
    const removeFrom = (list, index) => change({ [list]: spec[list].filter((entry, at) => at !== index) })
    // Choosing another main page clears everything that named a field of the old one.
    const chooseTable = (service) => change({ service, dateField: '', rows: [], across: null, pages: [], links: [], measures: [{ page: 0, field: '', aggregate: 'count', label: '' }], formulas: [], filters: [], tiles: [], chart: { type: 'none', outputs: [0] } })
    const toggle = (list, value, max) => (list.includes(value) ? list.filter((entry) => entry !== value) : (list.length < max ? [...list, value] : list))

    // Every other page keeps one match per row grouping, in the same order.
    const addRow = () => change({ rows: [...spec.rows, { field: '' }], pages: spec.pages.map((page) => ({ ...page, match: [...page.match, ''] })) })
    const removeRow = (index) => change({ rows: spec.rows.filter((entry, at) => at !== index), pages: spec.pages.map((page) => ({ ...page, match: page.match.filter((entry, at) => at !== index) })) })
    // A row that is a linked field looked up from another row (name beside
    // number) follows that row on the other pages, so it needs no match.
    const follows = (at) => {
        const found = LINKED.exec(spec.rows[at]?.field || '')
        const link = found ? spec.links[Number(found[1]) - 1] : null
        return !!link && spec.rows.some((row, index) => index !== at && row.field === link.from)
    }

    const changePage = (index, patch) => changeIn('pages', index, patch)
    const addPage = () => change({ pages: [...spec.pages, { ...EMPTY_PAGE, match: spec.rows.map(() => '') }] })
    const choosePageTable = (index, service) => change({
        pages: spec.pages.map((page, at) => (at === index ? { ...EMPTY_PAGE, service, match: spec.rows.map(() => '') } : page)),
        measures: spec.measures.map((measure) => (measure.page === index + 1 ? { ...measure, field: '' } : measure)),
        links: spec.links.map((link) => (link.page === index + 1 ? { ...link, from: '' } : link)),
    })
    const pageInUse = (index) => spec.measures.some((measure) => measure.page === index + 1) || spec.links.some((link) => link.page === index + 1)
    // Pages after the removed one move up, and so do the figures and links that point at them.
    const removePage = (index) => change({
        pages: spec.pages.filter((page, at) => at !== index),
        measures: spec.measures.map((measure) => (measure.page > index + 1 ? { ...measure, page: measure.page - 1 } : measure)),
        links: spec.links.map((link) => (link.page > index + 1 ? { ...link, page: link.page - 1 } : link)),
    })

    const changeLink = (index, patch) => changeIn('links', index, patch)
    const linkedNames = () => [...spec.rows.map((row) => row.field), spec.across?.field, ...spec.measures.map((measure) => measure.field), ...spec.pages.flatMap((page) => [...page.match, page.matchAcross])]
    const linkInUse = (index) => linkedNames().some((name) => (name || '').startsWith(`L${index + 1}.`))
    // Links after the removed one take the number before, wherever they are used.
    const removeLink = (index) => {
        const renumber = (name) => (name || '').replace(LINKED, (whole, number) => (Number(number) > index + 1 ? `L${Number(number) - 1}.` : whole))
        change({
            links: spec.links.filter((link, at) => at !== index),
            rows: spec.rows.map((row) => ({ ...row, field: renumber(row.field) })),
            across: spec.across ? { ...spec.across, field: renumber(spec.across.field) } : null,
            measures: spec.measures.map((measure) => ({ ...measure, field: renumber(measure.field) })),
            pages: spec.pages.map((page) => ({ ...page, match: page.match.map(renumber), matchAcross: renumber(page.matchAcross) })),
        })
    }

    const preview = async () => {
        setBusy('preview')
        setError('')
        try {
            const response = await awaitData(() => api.runBuilder(spec, hasPeriod ? range : {}), (fresh) => setReport(fresh.report))
            setReport(response.report)
        } catch (failure) {
            setReport(null)
            setError(failure.message)
        } finally {
            setBusy('')
        }
    }

    const save = async () => {
        setBusy('save')
        setError('')
        try {
            const response = await api.saveReport(spec, saved?.id)
            notify('success', `"${response.report.name}" saved. It is under Reports, in My reports.`)
            onSaved(response.report)
        } catch (failure) {
            setError(failure.message)
        } finally {
            setBusy('')
        }
    }

    const fieldSelect = (value, onChange, options, label, placeholder = 'Choose a field') => (
        <select className='bc-input' value={value || ''} onChange={(event) => onChange(event.target.value)} aria-label={label}>
            <option value=''>{placeholder}</option>
            {options.map((field) => <option key={field.name} value={field.name}>{field.label}</option>)}
        </select>
    )
    const pageSelect = (value, onChange, label) => (
        <select className='bc-input' value={value} onChange={(event) => onChange(event.target.value)} aria-label={label}>
            <option value=''>Choose a page</option>
            {(schema?.tables || []).map((entry) => <option key={entry.service} value={entry.service}>{entry.label} ({entry.fields.length} fields)</option>)}
        </select>
    )
    const limits = { ...LIMITS, ...(schema?.limits || {}) }
    const joins = schema?.joins || JOINS

    // The filters of one page. `named` goes in front of each control's name
    // so a screen reader can tell page 2's filters from page 1's.
    const filterLines = (list, page, onList, named) => (
        <>
            {list.map((filter, index) => {
                const set = (patch) => onList(list.map((entry, at) => (at === index ? { ...entry, ...patch } : entry)))
                return (
                    <div key={index} className='bc-builder-line'>
                        {fieldSelect(filter.field, (value) => set({ field: value }), ownFields(page), `${named} ${index + 1} field`)}
                        <select className='bc-input' value={filter.operator || 'eq'} onChange={(event) => set({ operator: event.target.value })} aria-label={`${named} ${index + 1} test`}>
                            {Object.entries(schema.operators).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                        {!['blank', 'notblank'].includes(filter.operator) && (
                            <input className='bc-input' value={filter.value || ''} onChange={(event) => set({ value: event.target.value })} placeholder={typeOf(page, filter.field) === 'date' ? '2026-09-30' : 'Value'} aria-label={`${named} ${index + 1} value`} />
                        )}
                        <button type='button' className='bc-link-button' onClick={() => onList(list.filter((entry, at) => at !== index))}>Remove</button>
                    </div>
                )
            })}
            {list.length < limits.filters && <button type='button' className='bc-button' onClick={() => onList([...list, { field: '', operator: 'eq', value: '' }])}>Add a filter</button>}
        </>
    )

    // The report's columns laid out the way a sheet shows them: a letter over
    // each figure, the heading under it, and what the column holds.
    const sheet = [
        ...spec.rows.map((row, index) => ({ key: `r${index}`, letter: '', heading: row.field ? labelIn(fields, row.field) : `Row ${index + 1}`, holds: 'Row grouping' })),
        ...spec.measures.map((measure, index) => ({ key: `m${index}`, letter: letter(index), heading: measureLabel(measure), holds: several ? pageName(measure.page || 0) : (table?.label || '') })),
        ...spec.formulas.map((formula, index) => ({ key: `f${index}`, letter: 'fx', heading: formula.label || `Formula ${index + 1}`, holds: formula.expression })),
    ]
    // In the preview each figure's heading carries its letter, so a formula
    // can be checked against the columns it reads.
    const lettered = (columns) => columns.map((column) => { const found = /^m(\d+)$/.exec(column.key); return found ? { ...column, label: `[${letter(Number(found[1]))}] ${column.label}` } : column })

    return (
        <div className='bc-page bc-builder'>
            <div className='bc-report-head'>
                <div>
                    <button type='button' className='bc-link-button' onClick={onClose}>&larr; All reports</button>
                    <h2>{saved ? `Edit "${saved.name}"` : 'Build a report'}</h2>
                    <p className='bc-muted'>Make your own report from one Business Central page or several together: choose what goes down the side, which figures to work out, and how to show them.</p>
                </div>
                <div className='bc-actions'>
                    <button type='button' className='bc-button' onClick={() => setGuideOpen((open) => !open)} aria-expanded={guideOpen}>{guideOpen ? 'Hide the guide' : 'How to build a report'}</button>
                </div>
            </div>

            {guideOpen && (
                <section className='bc-card bc-guide'>
                    <h3>How to build a report</h3>
                    <ol>
                        {GUIDE.map((step) => <li key={step.title}><strong>{step.title.replace(/^\d+\.\s*/, '')}.</strong> {step.body}</li>)}
                    </ol>
                    <p className='bc-muted'>
                        A worked example on one page: page "Value Entries", period "Posting Date", row "Source No", figure A "Sum of Sales Amount Actual", figure B "Sum of Cost Amount Actual",
                        formula "=A+B" called Profit, filter "Item Ledger Entry Type is Sale". That is profit by customer.
                    </p>
                    <p className='bc-muted'>
                        The same report across pages: add a link from "Source No" to "Customers" on "No" bringing in "Name", and add "Customers: Name" as a second row. Then add the page "Customer Ledger Entries",
                        matched to "Source No" with its "Customer No", and a figure C "Sum of Amount LCY" read from it. The formula "=A-C" now shows, per customer, sales against what the ledger moved.
                    </p>
                </section>
            )}

            {error && <div className='bc-banner bc-banner-error'>{error}</div>}
            {!schema && !error && <p className='bc-empty'>Reading the list of pages from Business Central...</p>}

            {schema && (
                <>
                    <section className='bc-card'>
                        <h3>1. Name and data</h3>
                        <div className='bc-form-grid'>
                            <label className='bc-field'>
                                <span className='bc-field-label'>Report name</span>
                                <input className='bc-input' maxLength={80} value={spec.name} onChange={(event) => setSpec({ ...spec, name: event.target.value })} placeholder='For example: Profit by customer' />
                            </label>
                            <label className='bc-field bc-field-wide'>
                                <span className='bc-field-label'>What it shows (optional)</span>
                                <input className='bc-input' maxLength={300} value={spec.description} onChange={(event) => setSpec({ ...spec, description: event.target.value })} />
                            </label>
                            <label className='bc-field'>
                                <span className='bc-field-label'>Find a page</span>
                                <input className='bc-input' value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${schema.tables.length} published pages`} />
                            </label>
                            <label className='bc-field'>
                                <span className='bc-field-label'>Business Central page</span>
                                <select className='bc-input' value={spec.service} onChange={(event) => chooseTable(event.target.value)} aria-label='Business Central page'>
                                    <option value=''>Choose a page</option>
                                    {tables.map((entry) => <option key={entry.service} value={entry.service}>{entry.label} ({entry.fields.length} fields)</option>)}
                                </select>
                            </label>
                            {table && (
                                <label className='bc-field'>
                                    <span className='bc-field-label'>Period is decided by</span>
                                    {fieldSelect(spec.dateField, (value) => change({ dateField: value }), dates(ownFields(0)), 'Period field', dates(ownFields(0)).length ? 'No period (read everything)' : 'This page has no dates')}
                                </label>
                            )}
                        </div>
                    </section>

                    {table && (
                        <>
                            <section className='bc-card'>
                                <h3>2. More pages and links</h3>
                                <p className='bc-muted'>Optional. Add pages to put their figures on the same lines as {table.label}, and links to look up names and details from a list.</p>

                                <h4>Links (lookups)</h4>
                                {spec.links.map((link, index) => {
                                    const other = tableOf(link.service)
                                    const inUse = linkInUse(index)
                                    return (
                                        <div key={index} className='bc-builder-block'>
                                            <div className='bc-builder-line'>
                                                <span className='bc-builder-letter' aria-hidden='true'>L{index + 1}</span>
                                                {several && (
                                                    <select className='bc-input' value={link.page} onChange={(event) => changeLink(index, { page: Number(event.target.value), from: '' })} aria-label={`Link ${index + 1} on page`} disabled={inUse}>
                                                        {pageTables.map((entry, page) => <option key={page} value={page}>{pageName(page)}</option>)}
                                                    </select>
                                                )}
                                                {fieldSelect(link.from, (value) => changeLink(index, { from: value }), ownFields(link.page), `Link ${index + 1} from field`, 'Take this field')}
                                                <span className='bc-muted'>and find it in</span>
                                                {pageSelect(link.service, (value) => changeLink(index, { service: value, to: '', fields: [] }), `Link ${index + 1} looks up`)}
                                                {other && fieldSelect(link.to, (value) => changeLink(index, { to: value }), other.fields, `Link ${index + 1} matching field`, 'Where this field is the same')}
                                                <button type='button' className='bc-link-button' disabled={inUse} title={inUse ? 'Take its fields out of the rows, figures and matches first' : ''} onClick={() => removeLink(index)}>Remove</button>
                                            </div>
                                            {other && (
                                                <div className='bc-builder-line'>
                                                    <span className='bc-muted'>Bring in:</span>
                                                    {link.fields.map((name) => (
                                                        <span key={name} className='bc-chip'>
                                                            {labelIn(other.fields, name)}
                                                            <button type='button' className='bc-chip-remove' aria-label={`Stop bringing in ${labelIn(other.fields, name)}`} disabled={linkedNames().includes(`L${index + 1}.${name}`)} onClick={() => changeLink(index, { fields: link.fields.filter((entry) => entry !== name) })}>&times;</button>
                                                        </span>
                                                    ))}
                                                    {link.fields.length < limits.linkFields && fieldSelect('', (value) => value && changeLink(index, { fields: [...link.fields, value] }), other.fields.filter((field) => !link.fields.includes(field.name)), `Link ${index + 1} bring in`, link.fields.length ? 'Add another field' : 'Choose a field to bring in')}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                                {spec.links.length < limits.links && <button type='button' className='bc-button' onClick={() => change({ links: [...spec.links, { ...EMPTY_LINK }] })}>Add a link</button>}
                                {spec.links.length === 0 && <p className='bc-muted'>A link works like a spreadsheet lookup: customer number in, customer name out.</p>}

                                <h4>Other pages</h4>
                                {spec.pages.map((page, index) => {
                                    const number = index + 2
                                    const inUse = pageInUse(index)
                                    return (
                                        <div key={index} className='bc-builder-block'>
                                            <div className='bc-builder-line'>
                                                <span className='bc-builder-letter' aria-hidden='true'>P{number}</span>
                                                {pageSelect(page.service, (value) => choosePageTable(index, value), `Page ${number}`)}
                                                {pageTables[index + 1] && fieldSelect(page.dateField, (value) => changePage(index, { dateField: value }), dates(ownFields(index + 1)), `Page ${number} period field`, dates(ownFields(index + 1)).length ? 'No period (read everything)' : 'This page has no dates')}
                                                <button type='button' className='bc-link-button' disabled={inUse} title={inUse ? 'Remove the figures and links that use this page first' : ''} onClick={() => removePage(index)}>Remove</button>
                                            </div>
                                            {pageTables[index + 1] && (
                                                <>
                                                    {spec.rows.map((row, at) => (
                                                        <div key={at} className='bc-builder-line'>
                                                            <span className='bc-muted'>"{labelIn(fields, row.field) || `Row ${at + 1}`}" is the same as</span>
                                                            {fieldSelect(page.match[at], (value) => changePage(index, { match: spec.rows.map((entry, position) => (position === at ? value : page.match[position] || '')) }), fieldsOf(index + 1), `Page ${number} match for row ${at + 1}`, follows(at) ? 'Follows from its link' : 'Choose the matching field')}
                                                        </div>
                                                    ))}
                                                    {spec.across && (
                                                        <div className='bc-builder-line'>
                                                            <span className='bc-muted'>Columns across "{labelIn(fields, spec.across.field)}" is the same as</span>
                                                            {fieldSelect(page.matchAcross, (value) => changePage(index, { matchAcross: value }), fieldsOf(index + 1), `Page ${number} match for columns across`, 'Choose the matching field')}
                                                        </div>
                                                    )}
                                                    {spec.rows.length === 0 && <p className='bc-muted'>With no row groupings there is nothing to match: this page's figures go on the one line of totals.</p>}
                                                    {filterLines(page.filters, index + 1, (filters) => changePage(index, { filters }), `Page ${number} filter`)}
                                                </>
                                            )}
                                        </div>
                                    )
                                })}
                                {spec.pages.length < limits.pages && <button type='button' className='bc-button' onClick={addPage}>Add a page</button>}
                                {several && (
                                    <div className='bc-builder-line'>
                                        <span className='bc-muted'>Lines to show</span>
                                        <select className='bc-input' value={spec.join || 'all'} onChange={(event) => change({ join: event.target.value })} aria-label='Lines to show'>
                                            {Object.entries(joins).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                                        </select>
                                    </div>
                                )}
                            </section>

                            <section className='bc-card'>
                                <h3>3. The table</h3>
                                <div className='bc-sheet-wrap'>
                                    <table className='bc-sheet' aria-label='Layout of the report'>
                                        <thead>
                                            <tr>{sheet.map((column) => <th key={column.key} scope='col'>{column.letter}</th>)}</tr>
                                        </thead>
                                        <tbody>
                                            <tr>{sheet.map((column) => <td key={column.key} className='bc-sheet-heading'>{column.heading}</td>)}</tr>
                                            <tr>{sheet.map((column) => <td key={column.key} className={column.letter === 'fx' ? 'bc-builder-formula' : 'bc-muted'}>{column.holds}</td>)}</tr>
                                        </tbody>
                                    </table>
                                </div>

                                <h4>Rows down the side</h4>
                                {spec.rows.map((row, index) => (
                                    <div key={index} className='bc-builder-line'>
                                        {fieldSelect(row.field, (value) => changeIn('rows', index, { field: value, by: typeOf(0, value) === 'date' ? 'month' : undefined }), fields, `Row ${index + 1}`)}
                                        {typeOf(0, row.field) === 'date' && (
                                            <select className='bc-input' value={row.by || 'month'} onChange={(event) => changeIn('rows', index, { by: event.target.value })} aria-label={`Row ${index + 1} grouped by`}>
                                                {Object.entries(schema.periods).map(([value, label]) => <option key={value} value={value}>By {label.toLowerCase()}</option>)}
                                            </select>
                                        )}
                                        <button type='button' className='bc-link-button' onClick={() => removeRow(index)}>Remove</button>
                                    </div>
                                ))}
                                {spec.rows.length < limits.rows && <button type='button' className='bc-button' onClick={addRow}>Add a row grouping</button>}
                                {spec.rows.length === 0 && <p className='bc-muted'>With no rows, the report is one line of totals.</p>}

                                <h4>Columns across (optional)</h4>
                                <div className='bc-builder-line'>
                                    {fieldSelect(spec.across?.field, (value) => change({ across: value ? { field: value, by: typeOf(0, value) === 'date' ? 'month' : undefined } : null }), fields, 'Columns across', 'None')}
                                    {spec.across && typeOf(0, spec.across.field) === 'date' && (
                                        <select className='bc-input' value={spec.across.by || 'month'} onChange={(event) => change({ across: { ...spec.across, by: event.target.value } })} aria-label='Columns across grouped by'>
                                            {Object.entries(schema.periods).map(([value, label]) => <option key={value} value={value}>By {label.toLowerCase()}</option>)}
                                        </select>
                                    )}
                                </div>

                                <h4>Figures</h4>
                                {spec.measures.map((measure, index) => {
                                    const page = measure.page || 0
                                    return (
                                        <div key={index} className='bc-builder-line'>
                                            <span className='bc-builder-letter' aria-hidden='true'>{letter(index)}</span>
                                            {several && (
                                                <select className='bc-input' value={page} onChange={(event) => changeIn('measures', index, { page: Number(event.target.value), field: '' })} aria-label={`Figure ${letter(index)} page`}>
                                                    {pageTables.map((entry, at) => <option key={at} value={at}>{pageName(at)}</option>)}
                                                </select>
                                            )}
                                            <select className='bc-input' value={measure.aggregate} onChange={(event) => changeIn('measures', index, { aggregate: event.target.value, ...(event.target.value === 'count' ? { field: '' } : {}) })} aria-label={`Figure ${letter(index)} works out`}>
                                                {Object.entries(schema.aggregates).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                                            </select>
                                            {measure.aggregate !== 'count' && fieldSelect(measure.field, (value) => changeIn('measures', index, { field: value }), measure.aggregate === 'distinct' ? fieldsOf(page) : numbers(fieldsOf(page)), `Figure ${letter(index)} field`, measure.aggregate === 'distinct' ? 'Choose a field' : 'Choose a number field')}
                                            <input className='bc-input' value={measure.label} maxLength={60} onChange={(event) => changeIn('measures', index, { label: event.target.value })} placeholder='Column heading (optional)' aria-label={`Figure ${letter(index)} heading`} />
                                            {!['count', 'distinct'].includes(measure.aggregate) && (
                                                <select className='bc-input' value={measure.format || 'money'} onChange={(event) => changeIn('measures', index, { format: event.target.value })} aria-label={`Figure ${letter(index)} shown as`}>
                                                    {FORMATS.filter((format) => format.value !== 'percent').map((format) => <option key={format.value} value={format.value}>{format.label}</option>)}
                                                </select>
                                            )}
                                            {spec.measures.length > 1 && <button type='button' className='bc-link-button' onClick={() => change({ measures: spec.measures.filter((entry, at) => at !== index), formulas: [], tiles: [], chart: { type: spec.chart.type, outputs: [0] } })}>Remove</button>}
                                        </div>
                                    )
                                })}
                                {spec.measures.length < limits.measures && <button type='button' className='bc-button' onClick={() => change({ measures: [...spec.measures, { page: 0, field: '', aggregate: 'sum', label: '', format: 'money' }] })}>Add a figure</button>}

                                <h4>Formulas</h4>
                                <p className='bc-muted'>Work on the figures by their letters, like spreadsheet columns: =A+B, =(A+B)/A*100. {(schema.functions || ['ABS', 'ROUND', 'MIN', 'MAX', 'IF']).join(', ')} are understood: =IF(A&gt;B, A-B, 0).</p>
                                {spec.formulas.map((formula, index) => (
                                    <div key={index} className='bc-builder-line'>
                                        <input className='bc-input' value={formula.label} maxLength={60} onChange={(event) => changeIn('formulas', index, { label: event.target.value })} placeholder='Column heading' aria-label={`Formula ${index + 1} heading`} />
                                        <input className='bc-input bc-builder-formula' value={formula.expression} maxLength={200} onChange={(event) => changeIn('formulas', index, { expression: event.target.value })} placeholder='=A-B' aria-label={`Formula ${index + 1}`} />
                                        <select className='bc-input' value={formula.format || 'number'} onChange={(event) => changeIn('formulas', index, { format: event.target.value })} aria-label={`Formula ${index + 1} shown as`}>
                                            {FORMATS.map((format) => <option key={format.value} value={format.value}>{format.label}</option>)}
                                        </select>
                                        <button type='button' className='bc-link-button' onClick={() => removeFrom('formulas', index)}>Remove</button>
                                    </div>
                                ))}
                                {spec.formulas.length < limits.formulas && <button type='button' className='bc-button' onClick={() => change({ formulas: [...spec.formulas, { label: '', expression: '=', format: 'money' }] })}>Add a formula</button>}
                            </section>

                            <section className='bc-card'>
                                <h3>4. Filters{several ? ` on ${table.label}` : ''}</h3>
                                {filterLines(spec.filters, 0, (filters) => change({ filters }), 'Filter')}
                                {spec.filters.length === 0 && <p className='bc-muted'>No filters: every row of the page counts{spec.dateField ? ', within the period' : ''}.{several ? ' The other pages have their own filters, under each page above.' : ''}</p>}
                            </section>

                            <section className='bc-card'>
                                <h3>5. Tiles, chart and order</h3>
                                <h4>Tiles at the top</h4>
                                <div className='bc-column-chooser'>
                                    {outputs.map((output) => (
                                        <label key={output.index} className='bc-check'>
                                            <input type='checkbox' checked={spec.tiles.some((tile) => tile.output === output.index)} onChange={() => change({ tiles: spec.tiles.some((tile) => tile.output === output.index) ? spec.tiles.filter((tile) => tile.output !== output.index) : (spec.tiles.length < limits.tiles ? [...spec.tiles, { output: output.index, label: '' }] : spec.tiles) })} />
                                            <span>{output.label}</span>
                                        </label>
                                    ))}
                                </div>
                                <h4>Chart</h4>
                                <div className='bc-builder-line'>
                                    <select className='bc-input' value={spec.chart.type} onChange={(event) => change({ chart: { ...spec.chart, type: event.target.value } })} aria-label='Chart type' disabled={!spec.rows.length}>
                                        {schema.charts.map((type) => <option key={type} value={type}>{CHART_LABELS[type]}</option>)}
                                    </select>
                                    {!spec.rows.length && <span className='bc-muted'>A chart needs at least one row grouping to plot against.</span>}
                                </div>
                                {spec.chart.type !== 'none' && spec.rows.length > 0 && (
                                    <div className='bc-column-chooser'>
                                        {outputs.map((output) => (
                                            <label key={output.index} className='bc-check'>
                                                <input type='checkbox' checked={spec.chart.outputs.includes(output.index)} onChange={() => change({ chart: { ...spec.chart, outputs: toggle(spec.chart.outputs, output.index, 3) } })} />
                                                <span>{output.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                                <h4>Order and length</h4>
                                <div className='bc-builder-line'>
                                    <select className='bc-input' value={spec.sort.output === null || spec.sort.output === undefined ? '' : spec.sort.output} onChange={(event) => change({ sort: { ...spec.sort, output: event.target.value === '' ? null : Number(event.target.value) } })} aria-label='Sort by'>
                                        <option value=''>In row order</option>
                                        {outputs.map((output) => <option key={output.index} value={output.index}>By {output.label}</option>)}
                                    </select>
                                    <select className='bc-input' value={spec.sort.descending ? 'down' : 'up'} onChange={(event) => change({ sort: { ...spec.sort, descending: event.target.value === 'down' } })} aria-label='Sort direction'>
                                        <option value='down'>Largest first</option>
                                        <option value='up'>Smallest first</option>
                                    </select>
                                    <label className='bc-builder-inline'>
                                        <span className='bc-muted'>Show up to</span>
                                        <input className='bc-input' type='number' min={1} max={5000} value={spec.limit} onChange={(event) => change({ limit: Number(event.target.value) || 500 })} aria-label='Rows to show' />
                                        <span className='bc-muted'>rows</span>
                                    </label>
                                </div>
                                <label className='bc-check'>
                                    <input type='checkbox' checked={spec.pinned} onChange={(event) => setSpec({ ...spec, pinned: event.target.checked })} />
                                    <span>Show this report's tiles and chart on the dashboard</span>
                                </label>
                            </section>

                            <section className='bc-card'>
                                <div className='bc-report-head'>
                                    <div>
                                        <h3>6. Preview and save</h3>
                                        {hasPeriod && (
                                            <div className='bc-range'>
                                                <input type='date' className='bc-input' value={range.from} max={range.to} onChange={(event) => setRange({ ...range, from: event.target.value })} aria-label='Preview from' />
                                                <span className='bc-muted'>to</span>
                                                <input type='date' className='bc-input' value={range.to} min={range.from} onChange={(event) => setRange({ ...range, to: event.target.value })} aria-label='Preview to' />
                                            </div>
                                        )}
                                    </div>
                                    <div className='bc-actions'>
                                        <button type='button' className='bc-button' disabled={!!busy} onClick={preview}>{busy === 'preview' ? 'Running...' : 'Preview'}</button>
                                        <button type='button' className='bc-button bc-button-primary' disabled={!!busy || !spec.name.trim()} title={spec.name.trim() ? '' : 'Give the report a name first'} onClick={save}>{busy === 'save' ? 'Saving...' : (saved ? 'Save changes' : 'Save report')}</button>
                                    </div>
                                </div>
                                <BCPreparing progress={preparing} />
                                <BCUpdating since={updating} />
                                {report && (
                                    <div className='bc-page'>
                                        {report.meta?.note && <div className='bc-banner bc-banner-info'>{report.meta.note}</div>}
                                        {report.kpis.length > 0 && (
                                            <StatCardGrid min={170}>
                                                {report.kpis.map((kpi) => <StatCard key={kpi.key} label={kpi.label} value={<span title={formatValue(kpi.value, kpi.format)}>{formatKpi(kpi.value, kpi.format)}</span>} />)}
                                            </StatCardGrid>
                                        )}
                                        {report.charts.map((chart) => <BCChart key={chart.key} chart={chart} />)}
                                        <BCDataTable columns={lettered(report.columns)} rows={report.rows} totals={report.totals} filterable />
                                        <p className='bc-muted'>{(report.meta?.rowsRead || 0).toLocaleString()} rows read from {report.meta?.table}.</p>
                                    </div>
                                )}
                                {!report && !busy && <p className='bc-muted'>Press Preview to run the report as it stands.</p>}
                            </section>
                        </>
                    )}
                </>
            )}
        </div>
    )
}

export default BCBuilder
